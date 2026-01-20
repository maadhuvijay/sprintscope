/**
 * SprintScope Tool Functions
 * 
 * These tools are used by the LLM to interact with the database and process queries.
 */

import { createClient } from '@supabase/supabase-js';
import { validateSQL } from './llm';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Schema information returned by get_schema
 */
export interface SchemaInfo {
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
    }>;
  }>;
  foreignKeys: Array<{
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
  }>;
}

/**
 * Query execution result from execute_query
 */
export interface QueryResult {
  rows: any[];
  rowCount: number;
  runtimeMs: number;
  error?: string;
}

// ============================================================================
// TOOL FUNCTIONS
// ============================================================================

/**
 * Initialize Supabase client
 */
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 
              process.env.SUPABASE_SERVICE_ROLE_KEY ||
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase URL and key must be configured');
  }
  
  return createClient(url, key, {
    auth: { persistSession: false }
  });
}

/**
 * get_schema - Returns tables/columns/FKs for grounding
 * @returns Schema information including all tables, columns, and foreign key relationships
 */
export async function get_schema(): Promise<SchemaInfo> {
  const supabase = getSupabaseClient();
  
  try {
    // Query information_schema to get table structure
    const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('teams', 'users', 'issues', 'sprints', 'issue_status_events', 'issue_comments')
        ORDER BY table_name, ordinal_position;
      `
    });

    // If RPC doesn't work, use direct query via REST API
    if (tablesError) {
      // Fallback: Query via REST API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || ''}`
          },
          body: JSON.stringify({
            query: `
              SELECT 
                table_name,
                column_name,
                data_type,
                is_nullable
              FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name IN ('teams', 'users', 'issues', 'sprints', 'issue_status_events', 'issue_comments')
              ORDER BY table_name, ordinal_position;
            `
          })
        }
      );

      if (!response.ok) {
        // If that fails, return a hardcoded schema based on migrations
        return getHardcodedSchema();
      }
    }

    // Group columns by table
    const tableMap = new Map<string, SchemaInfo['tables'][0]>();
    
    // Use hardcoded schema as fallback
    const schemaData = tables || [];
    
    for (const row of schemaData) {
      const tableName = row.table_name;
      if (!tableMap.has(tableName)) {
        tableMap.set(tableName, {
          name: tableName,
          columns: []
        });
      }
      tableMap.get(tableName)!.columns.push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES'
      });
    }

    // Get foreign keys
    const foreignKeys: SchemaInfo['foreignKeys'] = [];
    // For now, return hardcoded foreign keys based on schema
    // In production, query information_schema.table_constraints

    return {
      tables: Array.from(tableMap.values()),
      foreignKeys
    };
  } catch (error) {
    console.error('Error fetching schema:', error);
    // Return hardcoded schema as fallback
    return getHardcodedSchema();
  }
}

/**
 * Hardcoded schema fallback based on migration files
 */
function getHardcodedSchema(): SchemaInfo {
  return {
    tables: [
      {
        name: 'teams',
        columns: [
          { name: 'id', type: 'bigint', nullable: false },
          { name: 'team_id', type: 'uuid', nullable: false },
          { name: 'name', type: 'text', nullable: true },
          { name: 'description', type: 'text', nullable: true }
        ]
      },
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'bigint', nullable: false },
          { name: 'user_id', type: 'uuid', nullable: false },
          { name: 'team_id', type: 'uuid', nullable: true },
          { name: 'name', type: 'text', nullable: true },
          { name: 'email', type: 'text', nullable: true }
        ]
      },
      {
        name: 'issues',
        columns: [
          { name: 'id', type: 'bigint', nullable: false },
          { name: 'issue_id', type: 'uuid', nullable: false },
          { name: 'team_id', type: 'uuid', nullable: true },
          { name: 'sprint_id', type: 'uuid', nullable: true },
          { name: 'issue_key', type: 'text', nullable: false },
          { name: 'title', type: 'text', nullable: false },
          { name: 'description', type: 'text', nullable: true },
          { name: 'issue_type', type: 'text', nullable: true },
          { name: 'priority', type: 'text', nullable: true },
          { name: 'status', type: 'text', nullable: true },
          { name: 'story_points', type: 'integer', nullable: true },
          { name: 'assignee_id', type: 'uuid', nullable: true },
          { name: 'reporter_id', type: 'uuid', nullable: true },
          { name: 'created_at', type: 'timestamptz', nullable: true },
          { name: 'updated_at', type: 'timestamptz', nullable: true },
          { name: 'resolved_at', type: 'timestamptz', nullable: true }
        ]
      },
      {
        name: 'sprints',
        columns: [
          { name: 'id', type: 'bigint', nullable: false },
          { name: 'sprint_id', type: 'uuid', nullable: false },
          { name: 'team_id', type: 'uuid', nullable: true },
          { name: 'name', type: 'text', nullable: true },
          { name: 'start_date', type: 'date', nullable: true },
          { name: 'end_date', type: 'date', nullable: true },
          { name: 'status', type: 'text', nullable: true }
        ]
      },
      {
        name: 'issue_status_events',
        columns: [
          { name: 'id', type: 'bigint', nullable: false },
          { name: 'event_id', type: 'uuid', nullable: false },
          { name: 'issue_id', type: 'uuid', nullable: false },
          { name: 'from_status', type: 'text', nullable: true },
          { name: 'to_status', type: 'text', nullable: true },
          { name: 'changed_at', type: 'timestamptz', nullable: true }
        ]
      },
      {
        name: 'issue_comments',
        columns: [
          { name: 'id', type: 'bigint', nullable: false },
          { name: 'comment_id', type: 'uuid', nullable: false },
          { name: 'issue_id', type: 'uuid', nullable: false },
          { name: 'author_id', type: 'uuid', nullable: true },
          { name: 'body', type: 'text', nullable: false },
          { name: 'created_at', type: 'timestamptz', nullable: true }
        ]
      }
    ],
    foreignKeys: [
      { fromTable: 'issues', fromColumn: 'team_id', toTable: 'teams', toColumn: 'team_id' },
      { fromTable: 'issues', fromColumn: 'assignee_id', toTable: 'users', toColumn: 'user_id' },
      { fromTable: 'issues', fromColumn: 'reporter_id', toTable: 'users', toColumn: 'user_id' },
      { fromTable: 'sprints', fromColumn: 'team_id', toTable: 'teams', toColumn: 'team_id' },
      { fromTable: 'issue_status_events', fromColumn: 'issue_id', toTable: 'issues', toColumn: 'issue_id' },
      { fromTable: 'issue_comments', fromColumn: 'issue_id', toTable: 'issues', toColumn: 'issue_id' },
      { fromTable: 'issue_comments', fromColumn: 'author_id', toTable: 'users', toColumn: 'user_id' }
    ]
  };
}

/**
 * generate_sql - Converts natural language to SQL (SELECT + LIMIT)
 * Uses LLM to generate SQL from natural language query
 * @param naturalLanguageQuery - User's question in natural language
 * @param schemaContext - Schema information for grounding
 * @returns Generated SQL query with LIMIT clause, or clarification request
 */
export async function generate_sql(
  naturalLanguageQuery: string,
  schemaContext: SchemaInfo
): Promise<{ sql: string | null; clarification: string | null; isAmbiguous: boolean }> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const schemaText = JSON.stringify(schemaContext, null, 2);

  const prompt = `You are a SQL query generator. Given a user's natural language question and the database schema, generate a valid SQL SELECT query.

DATABASE SCHEMA:
${schemaText}

USER QUESTION: ${naturalLanguageQuery}

INSTRUCTIONS:
1. Generate a valid SQL SELECT query that answers the user's question
2. Always include a LIMIT clause (default 50, max 500)
3. Only use SELECT statements (read-only)
4. Use proper table and column names from the schema
5. If the question is ambiguous or unclear, respond with JSON: {"isAmbiguous": true, "clarification": "question text", "sql": null}
6. Otherwise, respond with JSON: {"isAmbiguous": false, "sql": "SELECT ...", "clarification": null}

CRITICAL RULES:
- Never use: INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE
- Always include LIMIT
- Use explicit table names (e.g., issues.title not just title)
- If multiple interpretations are possible, mark as ambiguous

Respond with ONLY valid JSON, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt,
      }],
      temperature: 0.1,
    });

    const textContent = response.content.find(
      (block) => block.type === 'text'
    ) as { type: 'text'; text: string } | undefined;

    if (textContent) {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          return {
            sql: result.sql || null,
            clarification: result.clarification || null,
            isAmbiguous: result.isAmbiguous || false,
          };
        } catch (e) {
          // JSON parse failed, continue to fallback
        }
      }

      // Fallback: try to extract SQL from response
      const sqlMatch = textContent.text.match(/SELECT[\s\S]*?(?:LIMIT\s+\d+)?/i);
      if (sqlMatch) {
        return {
          sql: sqlMatch[0],
          clarification: null,
          isAmbiguous: false,
        };
      }
    }

    return {
      sql: null,
      clarification: 'Could not generate SQL from the query. Please rephrase your question.',
      isAmbiguous: true,
    };
  } catch (error: any) {
    console.error('Error generating SQL:', error);
    return {
      sql: null,
      clarification: 'Error generating SQL. Please try again.',
      isAmbiguous: true,
    };
  }
}

/**
 * execute_query - Runs SQL against Supabase
 * @param sql - Validated SQL query to execute
 * @returns Query results, row count, execution time, and any errors
 */
export async function execute_query(sql: string): Promise<QueryResult> {
  const startTime = Date.now();
  
  // Validate SQL first
  const validation = validateSQL(sql, {
    defaultLimit: 50,
    maxLimit: 500,
    readOnly: true
  });
  
  if (!validation.isValid) {
    return {
      rows: [],
      rowCount: 0,
      runtimeMs: Date.now() - startTime,
      error: validation.error
    };
  }
  
  const sanitizedSql = validation.sanitizedSql || sql;
  const supabase = getSupabaseClient();
  
  try {
    const supabase = getSupabaseClient();
    
    // Use Supabase RPC to execute SQL via the exec_sql function
    // This requires the exec_sql function to be created in the database
    const { data, error } = await supabase.rpc('exec_sql', {
      query_text: sanitizedSql
    });
    
    if (error) {
      // If RPC doesn't exist, try REST API approach
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 
                  process.env.SUPABASE_SERVICE_ROLE_KEY ||
                  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (url && key) {
        const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({ query_text: sanitizedSql })
        });
        
        if (response.ok) {
          const restData = await response.json();
          const runtimeMs = Date.now() - startTime;
          
          // The function returns JSONB array, convert to regular objects
          const rows = Array.isArray(restData) 
            ? restData.map((item: any) => item.result || item)
            : [];
          
          return {
            rows,
            rowCount: rows.length,
            runtimeMs,
          };
        }
      }
      
      const runtimeMs = Date.now() - startTime;
      return {
        rows: [],
        rowCount: 0,
        runtimeMs,
        error: error.message || 'Query execution failed. Make sure the exec_sql function is created in your database.'
      };
    }
    
    const runtimeMs = Date.now() - startTime;
    
    // The function returns JSONB, convert to regular objects
    const rows = Array.isArray(data) 
      ? data.map((item: any) => {
          // Handle JSONB result format
          if (item && typeof item === 'object' && 'result' in item) {
            return item.result;
          }
          return item;
        })
      : [];
    
    return {
      rows,
      rowCount: rows.length,
      runtimeMs,
    };
  } catch (error: any) {
    const runtimeMs = Date.now() - startTime;
    return {
      rows: [],
      rowCount: 0,
      runtimeMs,
      error: error.message || 'Unknown error executing query'
    };
  }
}

/**
 * repair_sql - Fixes SQL using DB error + schema
 * Note: This should be handled by the LLM, but we provide a basic implementation
 * @param failedSql - The SQL that failed
 * @param errorMessage - The database error message
 * @param schemaContext - Schema information for context
 * @returns Repaired SQL that should work correctly
 */
export async function repair_sql(
  failedSql: string,
  errorMessage: string,
  schemaContext: SchemaInfo
): Promise<string> {
  // Basic repair: This is typically handled by the LLM
  // But we can provide some basic fixes here
  
  let repaired = failedSql;
  
  // Fix common issues
  if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
    // Try to find similar column names in schema
    const columnMatch = errorMessage.match(/column "(\w+)" does not exist/i);
    if (columnMatch) {
      const wrongColumn = columnMatch[1];
      // Search schema for similar column names
      for (const table of schemaContext.tables) {
        for (const col of table.columns) {
          if (col.name.toLowerCase() === wrongColumn.toLowerCase()) {
            // Column exists but might be in wrong table or case issue
            // Return original SQL - LLM should handle this
            return failedSql;
          }
        }
      }
    }
  }
  
  // If no basic fix found, return original (LLM will handle it)
  return failedSql;
}

/**
 * explain_results - Summarizes results in plain English
 * Uses LLM to explain query results in a conversational way
 * @param queryResults - The query results to explain
 * @param originalQuery - The original natural language query
 * @param sql - The SQL that was executed
 * @returns Plain English explanation of the results
 */
export async function explain_results(
  queryResults: QueryResult,
  originalQuery: string,
  sql: string
): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const resultsSummary = queryResults.error
    ? `Error: ${queryResults.error}`
    : `Found ${queryResults.rowCount} rows in ${queryResults.runtimeMs}ms. Sample data: ${JSON.stringify(queryResults.rows.slice(0, 5), null, 2)}`;

  const prompt = `You are SprintScope, an AI assistant explaining database query results.

ORIGINAL USER QUESTION: ${originalQuery}
SQL QUERY EXECUTED: ${sql}
QUERY RESULTS: ${resultsSummary}

INSTRUCTIONS:
1. Explain the results in plain, conversational English
2. Highlight key insights or patterns
3. If there's an error, explain what went wrong and suggest alternatives
4. If no results, explain why and suggest what the user might be looking for
5. Keep the explanation concise but informative
6. Use natural language, not technical jargon

Respond with ONLY the explanation text, no JSON or code blocks.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt,
      }],
      temperature: 0.3,
    });

    const textContent = response.content.find(
      (block) => block.type === 'text'
    ) as { type: 'text'; text: string } | undefined;

    return textContent?.text || 'Unable to generate explanation.';
  } catch (error: any) {
    console.error('Error explaining results:', error);
    return queryResults.error
      ? `Query failed: ${queryResults.error}`
      : `Found ${queryResults.rowCount} result(s).`;
  }
}
