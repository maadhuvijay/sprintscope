import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { get_schema, execute_query, repair_sql } from '@/lib/tools';
import { validateSQL } from '@/lib/llm';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL_NAME = 'claude-sonnet-4-5-20250929';

/**
 * Tool definitions for Anthropic tool use
 */
const tools = [
  {
    name: 'get_schema',
    description: 'Returns the database schema including all tables, columns, and foreign key relationships. Use this when you need to understand the database structure before generating SQL or when you need to verify table/column names exist.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'execute_query',
    description: 'Runs a validated SQL SELECT query against the Supabase database. Only call this after validating the SQL passes security guardrails (SELECT-only, has LIMIT, no forbidden keywords). Returns query results, row count, execution time, and any errors.',
    input_schema: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description: 'The validated SQL SELECT query to execute. Must be a single SELECT statement with a LIMIT clause.'
        }
      },
      required: ['sql']
    }
  },
  {
    name: 'repair_sql',
    description: 'Fixes SQL that failed to execute using the database error message and schema context. Use this when execute_query returns an error. Returns repaired SQL that should work correctly.',
    input_schema: {
      type: 'object',
      properties: {
        failed_sql: {
          type: 'string',
          description: 'The SQL query that failed to execute'
        },
        error_message: {
          type: 'string',
          description: 'The error message returned from the database'
        }
      },
      required: ['failed_sql', 'error_message']
    }
  }
];

/**
 * Execute a tool based on tool name and input
 */
async function executeTool(toolName: string, input: any): Promise<any> {
  switch (toolName) {
    case 'get_schema':
      return await get_schema();
    
    case 'execute_query':
      // Validate SQL before execution
      const validation = validateSQL(input.sql, {
        defaultLimit: 50,
        maxLimit: 500,
        readOnly: true
      });
      
      if (!validation.isValid) {
        return {
          error: validation.error,
          rows: [],
          rowCount: 0,
          runtimeMs: 0
        };
      }
      
      return await execute_query(validation.sanitizedSql || input.sql);
    
    case 'repair_sql':
      // Get schema for repair context
      const schema = await get_schema();
      return await repair_sql(input.failed_sql, input.error_message, schema);
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, chatHistory = [] } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Build messages array
    const messages: Anthropic.MessageParam[] = chatHistory.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Add current user message
    messages.push({
      role: 'user',
      content: message,
    });

    // System prompt
    const systemPrompt = `You are SprintScope, an AI assistant that helps users query sprint/Agile data using natural language and a connected SQL database.

Your workflow:
1. If you need to understand the database structure, call get_schema
2. Generate SQL based on the user's request
3. Validate the SQL (SELECT-only, has LIMIT, no forbidden keywords)
4. Execute the SQL using execute_query
5. If execution fails, use repair_sql to fix it, then retry
6. Explain the results in plain English

CRITICAL RULES:
- Only generate SELECT queries (read-only)
- Always include LIMIT (default 50, max 500)
- Never use forbidden keywords: INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE
- Validate SQL before calling execute_query
- If a query fails, use repair_sql to fix it before retrying
- Provide clear, conversational explanations of results`;

    // Call Claude with tool use
    let response = await anthropic.messages.create({
      model: MODEL_NAME,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages as Anthropic.MessageParam[],
      tools: tools as any,
      temperature: 0.1,
    });

    // Handle tool use - execute tools and continue conversation
    let toolUseCount = 0;
    let finalResponse = '';

    // Process tool use blocks
    while (response.stop_reason === 'tool_use') {
      // Collect all tool use blocks
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );
      
      toolUseCount += toolUseBlocks.length;

      // Execute all tools in parallel
      const toolResultsArray = await Promise.all(
        toolUseBlocks.map(async (block) => {
          try {
            const result = await executeTool(block.name, block.input);
            return {
              type: 'tool_result' as const,
              tool_use_id: block.id,
              content: JSON.stringify(result),
            };
          } catch (error: any) {
            return {
              type: 'tool_result' as const,
              tool_use_id: block.id,
              content: JSON.stringify({
                error: error.message || 'Tool execution failed',
              }),
              is_error: true,
            };
          }
        })
      );

      // Add tool results to messages
      messages.push({
        role: 'assistant',
        content: response.content,
      });

      messages.push({
        role: 'user',
        content: toolResultsArray,
      });

      // Continue conversation with tool results
      response = await anthropic.messages.create({
        model: MODEL_NAME,
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages as Anthropic.MessageParam[],
        tools: tools as any,
        temperature: 0.1,
      });
    }

    // Extract final text response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );

    finalResponse = textBlocks.map(block => block.text).join('\n');

    return NextResponse.json({
      response: finalResponse,
      toolCalls: toolUseCount,
    });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
