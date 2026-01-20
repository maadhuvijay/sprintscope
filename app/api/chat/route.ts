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

    // Step 1: Get schema
    console.log('Step 1: Getting schema...');
    const schema = await get_schema();

    // Step 2: Generate SQL
    console.log('Step 2: Generating SQL...');
    const genResult = await generate_sql(message, schema);

    // Step 3: Check if ambiguous → return clarification
    if (genResult.isAmbiguous || !genResult.sql) {
      return NextResponse.json({
        response: genResult.clarification || 'I need more information to answer your question. Could you please clarify?',
        clarification: genResult.clarification,
        sql: null,
        toolCalls: ['get_schema', 'generate_sql'],
      });
    }

    let generatedSql = genResult.sql;
    let usedRepair = false;

    // Step 4: Execute query
    console.log('Step 4: Executing query...');
    let execResult = await execute_query(generatedSql);

    // Step 5: If error → repair_sql → execute_query()
    if (execResult.error) {
      console.log('Step 5: Query failed, attempting repair...');
      const repairedSql = await repair_sql(generatedSql, execResult.error, schema);
      
      // Retry with repaired SQL
      console.log('Step 5: Retrying with repaired SQL...');
      execResult = await execute_query(repairedSql);
      usedRepair = true;
      
      // If still error, return error response
      if (execResult.error) {
        return NextResponse.json({
          response: `I encountered an error executing the query: ${execResult.error}. Please try rephrasing your question.`,
          sql: repairedSql,
          error: execResult.error,
          toolCalls: ['get_schema', 'generate_sql', 'execute_query', 'repair_sql', 'execute_query'],
        });
      }
      
      // Update to use repaired SQL
      generatedSql = repairedSql;
    }

    // Step 6: Explain results
    console.log('Step 6: Explaining results...');
    const finalSql = generatedSql;
    const explanation = await explain_results(execResult, message, finalSql);

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
      toolCalls: toolCalls,
    });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        response: `I encountered an error: ${error.message}. Please try again.`
      },
      { status: 500 }
    );
  }
}
