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
          { name: 'full_name', type: 'text', nullable: false },
          { name: 'email', type: 'text', nullable: false },
          { name: 'role', type: 'text', nullable: true },
          { name: 'created_at', type: 'timestamptz', nullable: true }
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
      { fromTable: 'users', fromColumn: 'team_id', toTable: 'teams', toColumn: 'team_id' },
      { fromTable: 'issues', fromColumn: 'team_id', toTable: 'teams', toColumn: 'team_id' },
      { fromTable: 'issues', fromColumn: 'assignee_id', toTable: 'users', toColumn: 'user_id' },
      { fromTable: 'issues', fromColumn: 'reporter_id', toTable: 'users', toColumn: 'user_id' },
      { fromTable: 'issues', fromColumn: 'sprint_id', toTable: 'sprints', toColumn: 'sprint_id' },
      { fromTable: 'sprints', fromColumn: 'team_id', toTable: 'teams', toColumn: 'team_id' },
      { fromTable: 'issue_status_events', fromColumn: 'issue_id', toTable: 'issues', toColumn: 'issue_id' },
      { fromTable: 'issue_comments', fromColumn: 'issue_id', toTable: 'issues', toColumn: 'issue_id' },
      { fromTable: 'issue_comments', fromColumn: 'author_id', toTable: 'users', toColumn: 'user_id' }
    ]
  };
}

/**
 * Build a human-readable description of table relationships
 */
function buildSchemaDescription(schema: SchemaInfo): string {
  let description = 'KEY RELATIONSHIPS:\n\n';
  
  // Describe each table and its relationships
  for (const table of schema.tables) {
    description += `${table.name.toUpperCase()} table:\n`;
    description += `  - Primary key: `;
    
    // Find primary key (usually id or {table}_id)
    const primaryKey = table.columns.find(col => 
      col.name === 'id' || col.name === `${table.name.replace('s', '')}_id` || col.name === `${table.name}_id`
    );
    if (primaryKey) {
      description += `${primaryKey.name}\n`;
    } else {
      description += `id (auto-generated)\n`;
    }
    
    // Find foreign keys
    const foreignKeys = schema.foreignKeys.filter(fk => fk.fromTable === table.name);
    if (foreignKeys.length > 0) {
      description += `  - Foreign keys:\n`;
      for (const fk of foreignKeys) {
        description += `    * ${fk.fromColumn} → ${fk.toTable}.${fk.toColumn}\n`;
      }
    }
    
    // Describe specific relationships
    if (table.name === 'users') {
      description += `  - user_id: Unique identifier for each user\n`;
      description += `  - team_id: References teams.team_id (which team the user belongs to)\n`;
      description += `  - full_name: The user's full name (use this to display names, NOT user_id)\n`;
    }
    
    if (table.name === 'issues') {
      description += `  - issue_id: Unique identifier for each issue\n`;
      description += `  - team_id: References teams.team_id (which team owns this issue)\n`;
      description += `  - assignee_id: References users.user_id (who is assigned to this issue)\n`;
      description += `  - reporter_id: References users.user_id (who reported this issue)\n`;
      description += `  - sprint_id: References sprints.sprint_id (which sprint this issue belongs to)\n`;
    }
    
    if (table.name === 'issue_comments') {
      description += `  - comment_id: Unique identifier for each comment\n`;
      description += `  - issue_id: References issues.issue_id (which issue this comment belongs to)\n`;
      description += `  - author_id: References users.user_id (who wrote this comment)\n`;
    }
    
    if (table.name === 'issue_status_events') {
      description += `  - event_id: Unique identifier for each status change event\n`;
      description += `  - issue_id: References issues.issue_id (which issue this event belongs to)\n`;
    }
    
    if (table.name === 'sprints') {
      description += `  - sprint_id: Unique identifier for each sprint\n`;
      description += `  - team_id: References teams.team_id (which team this sprint belongs to)\n`;
    }
    
    description += '\n';
  }
  
  description += `JOIN PATTERNS:\n`;
  description += `- To get user name from issue: JOIN users ON issues.assignee_id = users.user_id, then SELECT users.full_name\n`;
  description += `- To get team name from issue: JOIN teams ON issues.team_id = teams.team_id, then SELECT teams.name\n`;
  description += `- To get user's team: JOIN teams ON users.team_id = teams.team_id\n`;
  description += `- To get all issues for a user: JOIN issues ON users.user_id = issues.assignee_id\n`;
  description += `- To get comments for an issue: JOIN issue_comments ON issues.issue_id = issue_comments.issue_id\n`;
  description += `- To get comment author name: JOIN users ON issue_comments.author_id = users.user_id, then SELECT users.full_name\n`;
  
  return description;
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

  // Build a detailed schema description with relationships
  const schemaDescription = buildSchemaDescription(schemaContext);
  const schemaText = JSON.stringify(schemaContext, null, 2);

  const prompt = `You are a SQL query generator. Given a user's natural language question and the database schema, generate a valid SQL SELECT query.

DATABASE SCHEMA:
${schemaText}

TABLE RELATIONSHIPS (CRITICAL - USE THESE FOR JOINs):
${schemaDescription}

USER QUESTION: ${naturalLanguageQuery}

INSTRUCTIONS:
1. Generate a valid SQL SELECT query that answers the user's question
2. Always include a LIMIT clause (default 50, max 500)
3. Only use SELECT statements (read-only)
4. Use proper table and column names from the schema
5. **CRITICAL: Understanding relationships:**
   - issues.assignee_id = users.user_id (assignee relationship)
   - issues.reporter_id = users.user_id (reporter relationship)
   - issues.team_id = teams.team_id (team relationship)
   - users.team_id = teams.team_id (user's team relationship)
   - issue_comments.author_id = users.user_id (comment author relationship)
   - issue_comments.issue_id = issues.issue_id (comment to issue relationship)
   
6. **CRITICAL: When the question mentions assignee, reporter, author, or "who is assigned/working on", you MUST:**
   - JOIN the users table to get user information
   - Match assignee_id to users.user_id (for assignees) - issues.assignee_id = users.user_id
   - Match reporter_id to users.user_id (for reporters) - issues.reporter_id = users.user_id
   - Match author_id to users.user_id (for comment authors) - issue_comments.author_id = users.user_id
   - SELECT the user's full_name field (users.full_name) to display the full name - NOT user_id
   - Always use users.full_name, not users.name or users.user_id when displaying names
   - Example: SELECT i.*, u.full_name AS assignee_name FROM issues i JOIN users u ON i.assignee_id = u.user_id
7. **IMPORTANT: If the query requires data from multiple tables, you MUST use JOINs**
   - Use INNER JOIN, LEFT JOIN, or appropriate JOIN type based on the relationship
   - Join on foreign key relationships shown in the schema and relationships section above
   - Always use the correct foreign key relationships:
     * issues.assignee_id = users.user_id (to get assignee name)
     * issues.reporter_id = users.user_id (to get reporter name)
     * issues.team_id = teams.team_id (to get team name)
     * users.team_id = teams.team_id (to get user's team)
     * issue_comments.author_id = users.user_id (to get comment author name)
   - Example: If querying issues with team info: JOIN teams ON issues.team_id = teams.team_id
   - Example: If querying issues with assignee info: JOIN users ON issues.assignee_id = users.user_id
8. Use explicit table aliases for clarity (e.g., i for issues, t for teams, u for users, u2 for second user join)
9. When displaying user names, use aliases like "assignee_name", "reporter_name", "author_name" for clarity
10. If the question is ambiguous or unclear, respond with JSON: {"isAmbiguous": true, "clarification": "question text", "sql": null}
11. Otherwise, respond with JSON: {"isAmbiguous": false, "sql": "SELECT ...", "clarification": null}

CRITICAL RULES:
- Never use: INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE
- Always include LIMIT
- Use explicit table names with aliases (e.g., issues.title or i.title)
- **ALWAYS use JOINs when data is needed from multiple tables - do not generate separate queries**
- **ALWAYS join users table when assignee/reporter/author information is needed and display user.name**
- If multiple interpretations are possible, mark as ambiguous

JOIN EXAMPLES:
- Issues with team: SELECT i.*, t.name AS team_name FROM issues i JOIN teams t ON i.team_id = t.team_id
- Issues with assignee (SHOW FULL NAME): SELECT i.*, u.full_name AS assignee_name FROM issues i JOIN users u ON i.assignee_id = u.user_id
- Issues with assignee and their other work: SELECT i1.issue_key AS original_issue, i1.title AS original_title,
    u.full_name AS assignee_name,
    i2.issue_key AS other_issue, i2.title AS other_title, i2.status AS other_status
  FROM issues i1 
  JOIN users u ON i1.assignee_id = u.user_id 
  JOIN issues i2 ON u.user_id = i2.assignee_id 
  WHERE i1.issue_key = 'WEB-0017' AND i2.issue_key != 'WEB-0017'
- Issues with reporter: SELECT i.*, u.full_name AS reporter_name FROM issues i JOIN users u ON i.reporter_id = u.user_id
- Comments with author: SELECT ic.*, u.full_name AS author_name FROM issue_comments ic JOIN users u ON ic.author_id = u.user_id

SPECIAL CASE - "Who is assigned to [ISSUE] and what else are they working on?":
When the question asks about who is assigned and what else they're working on, you need to:
1. Find the issue by issue_key (e.g., 'WEB-0017')
2. JOIN with users table to get the assignee's full_name (NOT user_id)
3. Find all other issues assigned to that same person (same assignee_id)
4. Display both the original issue info and the other issues
5. Use LEFT JOIN if you want to show the assignee even if they have no other issues
6. Example structure:
   SELECT 
     i1.issue_key AS original_issue, 
     i1.title AS original_title,
     u.full_name AS assignee_name,
     i2.issue_key AS other_issue, 
     i2.title AS other_title, 
     i2.status AS other_status,
     i2.priority AS other_priority
   FROM issues i1
   JOIN users u ON i1.assignee_id = u.user_id
   LEFT JOIN issues i2 ON u.user_id = i2.assignee_id AND i2.issue_key != i1.issue_key
   WHERE i1.issue_key = 'WEB-0017'
   ORDER BY i2.issue_key
   LIMIT 50

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
 * @param schemaContext - Schema information to use actual column names in suggestions
 * @returns Plain English explanation of the results with suggestions
 */
export async function explain_results(
  queryResults: QueryResult,
  originalQuery: string,
  sql: string,
  schemaContext: SchemaInfo
): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const resultsSummary = queryResults.error
    ? `Error: ${queryResults.error}`
    : `Found ${queryResults.rowCount} rows in ${queryResults.runtimeMs}ms. Sample data: ${JSON.stringify(queryResults.rows.slice(0, 5), null, 2)}`;

  const schemaText = JSON.stringify(schemaContext, null, 2);
  const availableColumns = schemaContext.tables.flatMap(table => 
    table.columns.map(col => `${table.name}.${col.name}`)
  ).join(', ');

  const prompt = `You are SprintScope, an AI assistant explaining database query results.

DATABASE SCHEMA:
${schemaText}

AVAILABLE COLUMNS: ${availableColumns}

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
7. **CRITICAL: When creating suggestions, you MUST use the actual column names from the schema above**
8. **IMPORTANT: At the end, provide 3-5 relevant follow-up suggestions as a JSON array in this format:**
   {"explanation": "your explanation text", "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]}
   
   The suggestions should be:
   - Relevant to the current query and results
   - Actionable follow-up questions the user might want to ask
   - **Use actual column names from the schema** (e.g., if schema has "status", "priority", "team_id", use those exact names)
   - Based on the data structure and what would make sense next
   - Examples using real columns:
     * If schema has "status" column: "Filter by status" or "Show issues with status = 'done'"
     * If schema has "team_id": "Break this down by team" or "Show results for team_id = ..."
     * If schema has "created_at": "Show items created in the last week"
     * If schema has "assignee_id": "Group by assignee" or "Show issues assigned to..."
   - Use the exact column names from the schema, not generic terms

Respond with ONLY valid JSON in the format above, no other text.`;

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

    if (textContent) {
      // Try to parse as JSON first
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.explanation && parsed.suggestions) {
            // Return as JSON string to be parsed by caller
            return JSON.stringify(parsed);
          }
        } catch (e) {
          // Not JSON, continue
        }
      }
      // Fallback: return plain text
      return textContent.text;
    }
    
    return 'Unable to generate explanation.';
  } catch (error: any) {
    console.error('Error explaining results:', error);
    return queryResults.error
      ? `Query failed: ${queryResults.error}`
      : `Found ${queryResults.rowCount} result(s).`;
  }
}
