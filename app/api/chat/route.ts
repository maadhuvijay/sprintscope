import { NextRequest, NextResponse } from 'next/server';
import { get_schema, generate_sql, execute_query, repair_sql, explain_results } from '@/lib/tools';
import { validateSQL } from '@/lib/llm';

/**
 * Sequential tool execution flow as specified:
 * 1. get_schema()
 * 2. generate_sql()
 * 3. If ambiguous → return clarification
 * 4. execute_query()
 * 5. If error → repair_sql() → execute_query()
 * 6. explain_results()
 * 7. Return response
 */

/**
 * Generate default suggestions based on query, results, and schema
 * Returns exactly 3 contextually relevant suggestions
 */
function generateDefaultSuggestions(query: string, execResult: any, schema: any): string[] {
  const suggestions: string[] = [];
  const lowerQuery = query.toLowerCase();
  
  // Get actual column names from schema
  const allColumns = schema.tables.flatMap((table: any) => 
    table.columns.map((col: any) => ({ table: table.name, column: col.name }))
  );
  
  // Find relevant columns
  const statusColumn = allColumns.find((c: any) => c.column.toLowerCase().includes('status'));
  const teamColumn = allColumns.find((c: any) => c.column.toLowerCase().includes('team'));
  const assigneeColumn = allColumns.find((c: any) => c.column.toLowerCase().includes('assignee'));
  const priorityColumn = allColumns.find((c: any) => c.column.toLowerCase().includes('priority'));
  const createdAtColumn = allColumns.find((c: any) => c.column.toLowerCase().includes('created_at') || c.column.toLowerCase().includes('created'));
  const issueTypeColumn = allColumns.find((c: any) => c.column.toLowerCase().includes('issue_type') || c.column.toLowerCase().includes('type'));
  const sprintColumn = allColumns.find((c: any) => c.column.toLowerCase().includes('sprint'));
  
  // Context-aware suggestions based on what was queried
  const isBugQuery = lowerQuery.includes('bug');
  const isAssigneeQuery = lowerQuery.includes('assignee') || lowerQuery.includes('who is') || lowerQuery.includes('working on');
  const isTeamQuery = lowerQuery.includes('team');
  const isSprintQuery = lowerQuery.includes('sprint');
  const isGroupedQuery = lowerQuery.includes('group') || lowerQuery.includes('break down') || lowerQuery.includes('by');
  
  // Generate contextually relevant suggestions
  if (isBugQuery) {
    // If query was about bugs, suggest bug-related follow-ups
    if (statusColumn) {
      suggestions.push(`Show all bugs grouped by ${statusColumn.column}`);
    }
    if (priorityColumn) {
      suggestions.push(`Show bugs with ${priorityColumn.column} = 'p0' or ${priorityColumn.column} = 'p1' from the last month`);
    }
    if (assigneeColumn && statusColumn) {
      suggestions.push(`Show bugs where ${assigneeColumn.column} is not null and ${statusColumn.column} = 'in_progress'`);
    }
  } else if (isAssigneeQuery) {
    // If query was about assignees, suggest assignee-related follow-ups
    if (statusColumn) {
      suggestions.push(`Show all issues grouped by ${statusColumn.column}`);
    }
    if (priorityColumn) {
      suggestions.push(`Show issues with ${priorityColumn.column} = 'p0' or ${priorityColumn.column} = 'p1'`);
    }
    if (createdAtColumn) {
      suggestions.push(`Show issues created in the last two weeks`);
    }
  } else if (isGroupedQuery) {
    // If query was grouped, suggest filtering or further breakdown
    if (statusColumn && !lowerQuery.includes('status')) {
      suggestions.push(`Filter by ${statusColumn.column}`);
    }
    if (priorityColumn && !lowerQuery.includes('priority')) {
      suggestions.push(`Group by ${priorityColumn.column}`);
    }
    if (createdAtColumn) {
      suggestions.push(`Show items from the last 30 days`);
    }
  } else if (isTeamQuery) {
    // If query was about teams
    if (statusColumn) {
      suggestions.push(`Show team performance by ${statusColumn.column}`);
    }
    if (sprintColumn) {
      suggestions.push(`Show team sprints`);
    }
    if (assigneeColumn) {
      suggestions.push(`Show team members and their issues`);
    }
  } else if (isSprintQuery) {
    // If query was about sprints
    if (statusColumn) {
      suggestions.push(`Filter sprints by ${statusColumn.column}`);
    }
    if (assigneeColumn) {
      suggestions.push(`Break down by ${assigneeColumn.column}`);
    }
    if (priorityColumn) {
      suggestions.push(`Show sprint issues by ${priorityColumn.column}`);
    }
  } else {
    // Generic suggestions based on available columns
    if (statusColumn) {
      suggestions.push(`Filter by ${statusColumn.column}`);
    }
    if (issueTypeColumn) {
      suggestions.push(`Group by ${issueTypeColumn.column}`);
    }
    if (createdAtColumn) {
      suggestions.push(`Show items created in the last two weeks`);
    }
  }
  
  // Ensure we have exactly 3 suggestions
  // If we have more, take the first 3
  // If we have fewer, add generic ones
  while (suggestions.length < 3) {
    if (statusColumn && !suggestions.some(s => s.includes(statusColumn.column))) {
      suggestions.push(`Filter by ${statusColumn.column}`);
    } else if (priorityColumn && !suggestions.some(s => s.includes(priorityColumn.column))) {
      suggestions.push(`Group by ${priorityColumn.column}`);
    } else if (createdAtColumn && !suggestions.some(s => s.includes('created'))) {
      suggestions.push(`Show items from the last 30 days`);
    } else {
      suggestions.push('Show more details');
    }
  }
  
  return suggestions.slice(0, 3); // Return exactly 3 suggestions
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Log environment check (without exposing sensitive data)
    console.log('Environment check:', {
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasSupabaseUrl: !!(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
      hasSupabaseKey: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      nodeEnv: process.env.NODE_ENV,
    });

    // Step 1: Get schema
    console.log('Step 1: Getting schema...');
    let schema;
    try {
      schema = await get_schema();
    } catch (error: any) {
      console.error('Error getting schema:', error);
      return NextResponse.json({
        response: 'Database connection error. Please check your configuration and try again.',
        sql: null,
        results: null,
        rowCount: 0,
        runtimeMs: 0,
        suggestions: ['Check database connection', 'Verify environment variables', 'Contact support'],
        assumptions: [],
        toolCalls: ['get_schema'],
        error: error.message,
      }, { status: 500 });
    }

    // Step 2: Generate SQL
    console.log('Step 2: Generating SQL...');
    let genResult;
    try {
      genResult = await generate_sql(message, schema);
    } catch (error: any) {
      console.error('Unexpected error in generate_sql (exception thrown):', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      // If generate_sql throws an exception (shouldn't happen, but handle it)
      return NextResponse.json({
        response: `Unexpected error: ${error.message || 'Unknown error'}. Please check the server logs for details.`,
        sql: null,
        results: null,
        rowCount: 0,
        runtimeMs: 0,
        suggestions: ['Try rephrasing your question', 'Check server configuration', 'Contact support if the issue persists'],
        assumptions: [],
        toolCalls: ['get_schema', 'generate_sql'],
        error: error.message,
      }, { status: 500 });
    }
    
    // Check if generate_sql returned an error (it should return an object, not throw)
    if (!genResult) {
      console.error('generate_sql returned null/undefined');
      return NextResponse.json({
        response: 'Error generating SQL: No response from AI service. Please try again.',
        sql: null,
        results: null,
        rowCount: 0,
        runtimeMs: 0,
        suggestions: ['Try again', 'Check AI service configuration', 'Contact support'],
        assumptions: [],
        toolCalls: ['get_schema', 'generate_sql'],
        error: 'generate_sql returned null',
      }, { status: 500 });
    }

    // Step 3: Check if ambiguous → return clarification
    if (genResult.isAmbiguous || !genResult.sql) {
      // Log the clarification/error for debugging
      console.log('Query is ambiguous or SQL generation failed:', {
        isAmbiguous: genResult.isAmbiguous,
        hasSql: !!genResult.sql,
        clarification: genResult.clarification,
      });
      
      // Generate helpful suggestions for clarification
      const clarificationSuggestions = [
        'Try being more specific about what you want to see',
        'Specify a time range or date',
        'Mention which team or sprint you\'re interested in',
        'Clarify what type of data you need'
      ];
      
      // Use the clarification message from generate_sql (it has better error messages now)
      const responseMessage = genResult.clarification || 'I need more information to answer your question. Could you please clarify?';
      
      return NextResponse.json({
        response: responseMessage,
        clarification: genResult.clarification,
        sql: null,
        results: null,
        rowCount: 0,
        runtimeMs: 0,
        suggestions: clarificationSuggestions,
        assumptions: genResult.assumptions || [],
        toolCalls: ['get_schema', 'generate_sql'],
      });
    }

    let generatedSql = genResult.sql;
    let usedRepair = false;
    let allAssumptions: string[] = [...(genResult.assumptions || [])];
    
    // Add assumption about LIMIT if it was automatically applied
    if (generatedSql && !generatedSql.match(/\bLIMIT\s+\d+/i)) {
      allAssumptions.push('Applied default result limit of 50 rows');
    } else if (generatedSql) {
      const limitMatch = generatedSql.match(/\bLIMIT\s+(\d+)/i);
      if (limitMatch) {
        const limitValue = parseInt(limitMatch[1], 10);
        if (limitValue <= 50) {
          allAssumptions.push(`Applied result limit of ${limitValue} rows`);
        } else if (limitValue > 500) {
          allAssumptions.push(`Capped result limit to 500 rows (requested ${limitValue})`);
        }
      }
    }

    // Step 4: Execute query
    console.log('Step 4: Executing query...');
    let execResult = await execute_query(generatedSql);

    // Step 5: If error → repair_sql → execute_query()
    if (execResult.error) {
      console.log('Step 5: Query failed, attempting repair...');
      const repairResult = await repair_sql(generatedSql, execResult.error, schema);
      
      // Add repair assumptions
      allAssumptions.push(...(repairResult.assumptions || []));
      
      // Retry with repaired SQL
      console.log('Step 5: Retrying with repaired SQL...');
      execResult = await execute_query(repairResult.repairedSql);
      usedRepair = true;
      
      // If still error, return error response
      if (execResult.error) {
        return NextResponse.json({
          response: `I encountered an error executing the query: ${execResult.error}. Please try rephrasing your question.`,
          sql: repairResult.repairedSql,
          error: execResult.error,
          assumptions: allAssumptions,
          toolCalls: ['get_schema', 'generate_sql', 'execute_query', 'repair_sql', 'execute_query'],
        });
      }
      
      // Update to use repaired SQL
      generatedSql = repairResult.repairedSql;
    }

    // Step 6: Explain results
    console.log('Step 6: Explaining results...');
    const finalSql = generatedSql;
    const explanationResult = await explain_results(execResult, message, finalSql, schema);
    
    // Parse explanation result (may contain JSON with suggestions)
    let explanation = explanationResult;
    let suggestions: string[] = [];
    
      try {
      const parsed = JSON.parse(explanationResult);
      if (parsed.explanation && Array.isArray(parsed.suggestions)) {
        explanation = parsed.explanation;
        // Ensure exactly 3 suggestions
        suggestions = parsed.suggestions.slice(0, 3);
        // If fewer than 3, fill with defaults
        if (suggestions.length < 3) {
          const defaults = generateDefaultSuggestions(message, execResult, schema);
          suggestions = [...suggestions, ...defaults].slice(0, 3);
        }
      } else {
        // Has explanation but no suggestions, generate defaults
        explanation = parsed.explanation || explanationResult;
        suggestions = generateDefaultSuggestions(message, execResult, schema);
      }
    } catch (e) {
      // Not JSON, use as-is and generate default suggestions
      suggestions = generateDefaultSuggestions(message, execResult, schema);
    }

    // Step 7: Return response
    const toolCalls = ['get_schema', 'generate_sql', 'execute_query'];
    if (usedRepair) {
      toolCalls.push('repair_sql', 'execute_query');
    }
    toolCalls.push('explain_results');

    return NextResponse.json({
      response: explanation,
      sql: finalSql,
      results: execResult.rows || [],
      rowCount: execResult.rowCount,
      runtimeMs: execResult.runtimeMs,
      error: execResult.error,
      suggestions: suggestions,
      assumptions: allAssumptions,
      toolCalls: toolCalls,
    });
  } catch (error: any) {
    console.error('Error in chat API:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        response: `I encountered an unexpected error: ${error.message || 'Unknown error'}. Please try again or contact support if the issue persists.`,
        sql: null,
        results: null,
        rowCount: 0,
        runtimeMs: 0,
        suggestions: ['Try again', 'Check your question format', 'Contact support'],
        assumptions: [],
        toolCalls: [],
      },
      { status: 500 }
    );
  }
}
