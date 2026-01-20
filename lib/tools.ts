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
          { name: 'team_id', type: 'uuid', nullable: true },
          { name: 'team_key', type: 'text', nullable: true },
          { name: 'team_name', type: 'text', nullable: true },
          { name: 'created_at', type: 'timestamptz', nullable: true }
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
          { name: 'sprint_name', type: 'text', nullable: false },
          { name: 'start_date', type: 'date', nullable: true },
          { name: 'end_date', type: 'date', nullable: true },
          { name: 'goal', type: 'text', nullable: true },
          { name: 'created_at', type: 'timestamptz', nullable: true }
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
  description += `- To get team info from issue: JOIN teams ON issues.team_id = teams.team_id, then SELECT teams.team_key, teams.team_name\n`;
  description += `- To get user's team: JOIN teams ON users.team_id = teams.team_id\n`;
  description += `- Teams can be referenced by team_key (similar to how issues are referenced by issue_key)\n`;
  description += `- **CRITICAL: issue_key contains the team identifier (e.g., "ACCEL-001" = team ACCEL, "WEB-0017" = team WEB)**\n`;
  description += `- **When filtering by team name/key mentioned in query, use: WHERE issue_key ILIKE 'TEAMNAME-%' OR issue_key ILIKE '%TEAMNAME%'**\n`;
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
): Promise<{ sql: string | null; clarification: string | null; isAmbiguous: boolean; assumptions: string[] }> {
  // Check for API key before proceeding
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set');
    return {
      sql: null,
      clarification: 'Configuration error: AI service is not properly configured. Please contact support.',
      isAmbiguous: true,
      assumptions: [],
    };
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic({
    apiKey: apiKey,
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
1. **CRITICAL: Check for ambiguous queries FIRST - If the question contains undefined metrics or unclear terms, you MUST ask for clarification:**
   - Metric definitions without thresholds: "risky", "healthy", "stuck", "slow", "high velocity", "at risk", "overdue", "behind schedule"
   - Time references without context: "recent", "last sprint", "this sprint", "last month" (if no team/sprint context)
   - Missing scope: team, sprint, status when multiple interpretations exist
   - **CRITICAL: User names - If the query mentions only a first name (e.g., "Avery", "John", "Sarah") without a last name or full name, you MUST ask for clarification because multiple users may share the same first name. The users table stores full_name (e.g., "Avery Hernandez", "Avery Smith"), so first names alone are ambiguous.**
   - If ANY of these apply, respond with: {"isAmbiguous": true, "clarification": "What do you mean by 'risky'? For example: sprints with issues past due date, sprints with low completion rate, or sprints with many blocked issues?", "sql": null, "assumptions": []}
2. **CRITICAL: Verify column names against the schema - NEVER use columns that don't exist:**
   - The sprints table has: sprint_id, team_id, sprint_name (NOT name), start_date, end_date, goal, created_at
   - The issues table has: issue_id, issue_key, team_id, assignee_id, reporter_id, title, description, issue_type, status, priority, story_points, sprint_id, created_at, updated_at
   - The users table has: user_id, team_id, full_name (NOT name), email, created_at
   - The teams table has: team_id, team_key (key identifier for team, like issue_key), team_name, created_at
   - ALWAYS check the schema JSON above to verify column names before using them
3. Generate a valid SQL SELECT query that answers the user's question
4. Always include a LIMIT clause (default 50, max 500)
5. Only use SELECT statements (read-only)
6. Use proper table and column names from the schema
7. **CRITICAL: Understanding relationships:**
   - issues.assignee_id = users.user_id (assignee relationship)
   - issues.reporter_id = users.user_id (reporter relationship)
   - issues.team_id = teams.team_id (team relationship)
   - users.team_id = teams.team_id (user's team relationship)
   - issue_comments.author_id = users.user_id (comment author relationship)
   - issue_comments.issue_id = issues.issue_id (comment to issue relationship)
   - **CRITICAL: issue_key contains the team identifier - e.g., "ACCEL-001" means team ACCEL, "WEB-0017" means team WEB**
   - **When filtering by team name/key, you can use pattern matching on issue_key: WHERE issue_key LIKE 'TEAMNAME-%' (case-insensitive)**
   - **Example: For "Team ACCEL", use: WHERE issue_key ILIKE 'ACCEL-%' OR issue_key ILIKE '%ACCEL%'**
   - **This is often more reliable than team_id joins when the team name/key is mentioned in the query**
   
6. **CRITICAL: When the question mentions assignee, reporter, author, or "who is assigned/working on", you MUST:**
   - JOIN the users table to get user information
   - Match assignee_id to users.user_id (for assignees) - issues.assignee_id = users.user_id
   - Match reporter_id to users.user_id (for reporters) - issues.reporter_id = users.user_id
   - Match author_id to users.user_id (for comment authors) - issue_comments.author_id = users.user_id
   - SELECT the user's full_name field (users.full_name) to display the full name - NOT user_id
   - Always use users.full_name, not users.name or users.user_id when displaying names
   - **CRITICAL: If the query mentions only a first name (e.g., "Avery", "John") without a last name, you MUST ask for clarification because multiple users may share the same first name. The users.full_name column contains full names like "Avery Hernandez" or "Avery Smith", so first names alone are ambiguous.**
   - **When filtering by user name, use: WHERE users.full_name ILIKE '%FullName%' (case-insensitive)**
   - Example: SELECT i.*, u.full_name AS assignee_name FROM issues i JOIN users u ON i.assignee_id = u.user_id WHERE u.full_name ILIKE '%Avery Hernandez%'
7. **IMPORTANT: If the query requires data from multiple tables, you MUST use JOINs**
   - Use INNER JOIN, LEFT JOIN, or appropriate JOIN type based on the relationship
   - Join on foreign key relationships shown in the schema and relationships section above
   - Always use the correct foreign key relationships:
     * issues.assignee_id = users.user_id (to get assignee name)
     * issues.reporter_id = users.user_id (to get reporter name)
     * issues.team_id = teams.team_id (to get team_key and team_name)
     * users.team_id = teams.team_id (to get user's team)
     * issue_comments.author_id = users.user_id (to get comment author name)
   - Example: If querying issues with team info: JOIN teams ON issues.team_id = teams.team_id, then SELECT teams.team_key, teams.team_name
   - **CRITICAL: Teams can be referenced by team_key (similar to issue_key for issues) - use teams.team_key when filtering or displaying team identifiers**
   - **CRITICAL: When filtering by team name/key mentioned in the query, use pattern matching on issue_key:**
     * For "Team ACCEL" or "ACCEL team": WHERE issue_key ILIKE 'ACCEL-%' OR issue_key ILIKE '%ACCEL%'
     * For "Team WEB": WHERE issue_key ILIKE 'WEB-%' OR issue_key ILIKE '%WEB%'
     * This is often more reliable than team_id joins when team name/key is explicitly mentioned
   - Example: If querying issues with assignee info: JOIN users ON issues.assignee_id = users.user_id
8. Use explicit table aliases for clarity (e.g., i for issues, t for teams, u for users, s for sprints, u2 for second user join)
9. When displaying user names, use aliases like "assignee_name", "reporter_name", "author_name" for clarity
10. **CRITICAL: For sprints table, use sprint_name (NOT name) - the column is sprint_name, not name**
11. If the question is ambiguous or unclear (see instruction #1), respond with JSON: {"isAmbiguous": true, "clarification": "question text", "sql": null, "assumptions": []}
12. Otherwise, respond with JSON: {"isAmbiguous": false, "sql": "SELECT ...", "clarification": null, "assumptions": ["assumption 1", "assumption 2"]}

CRITICAL RULES:
- **ASK FOR CLARIFICATION if the query contains undefined metrics like "risky", "healthy", "stuck", "slow", "at risk", "overdue", "behind schedule" without clear definition**
- **VERIFY ALL COLUMN NAMES against the schema JSON - sprints table uses sprint_name (NOT name), users table uses full_name (NOT name)**
- Never use: INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE
- Always include LIMIT
- Use explicit table names with aliases (e.g., issues.title or i.title, sprints.sprint_name or s.sprint_name)
- **ALWAYS use JOINs when data is needed from multiple tables - do not generate separate queries**
- **ALWAYS join users table when assignee/reporter/author information is needed and display users.full_name (NOT user_id)**
- **When filtering by issue_type, status, priority, use case-insensitive matching: LOWER(column) = 'value' OR column ILIKE '%value%'**
- **When grouping/breaking down by assignee, always JOIN users table and GROUP BY users.full_name, not assignee_id**
- **For "break down by assignee" queries, use: SELECT u.full_name AS assignee_name, COUNT(*) FROM issues i JOIN users u ON i.assignee_id = u.user_id GROUP BY u.full_name**
- If multiple interpretations are possible, mark as ambiguous

JOIN EXAMPLES:
- Issues with team: SELECT i.*, t.team_key, t.team_name FROM issues i JOIN teams t ON i.team_id = t.team_id
- Issues with assignee (SHOW FULL NAME): SELECT i.*, u.full_name AS assignee_name FROM issues i JOIN users u ON i.assignee_id = u.user_id
- Filter by user full name: SELECT i.*, u.full_name FROM issues i JOIN users u ON i.assignee_id = u.user_id WHERE u.full_name ILIKE '%Avery Hernandez%'
- **CRITICAL: If query mentions only first name (e.g., "Avery"), ask for clarification - multiple users may share the same first name**
- Sprints with team: SELECT s.sprint_name, s.start_date, s.end_date, t.team_key, t.team_name FROM sprints s JOIN teams t ON s.team_id = t.team_id
- Filter by team_key (using JOIN): SELECT * FROM issues i JOIN teams t ON i.team_id = t.team_id WHERE t.team_key = 'TEAM-001'
- **CRITICAL: Filter by team using issue_key pattern (when team name/key is mentioned):**
  * For "Team ACCEL" or "ACCEL team": SELECT * FROM issues WHERE issue_key ILIKE 'ACCEL-%' OR issue_key ILIKE '%ACCEL%'
  * For "Team WEB": SELECT * FROM issues WHERE issue_key ILIKE 'WEB-%' OR issue_key ILIKE '%WEB%'
  * This is the preferred method when team name/key is explicitly mentioned in the query
- **CRITICAL: Sprints table column is sprint_name (NOT name): SELECT s.sprint_name, s.start_date, s.end_date FROM sprints s**
- Break down bugs by assignee (WITH NAME AND CASE-INSENSITIVE):
  SELECT 
    u.full_name AS assignee_name,
    COUNT(*) AS bug_count,
    STRING_AGG(i.issue_key, ', ') AS issue_keys
  FROM issues i
  JOIN users u ON i.assignee_id = u.user_id
  WHERE (LOWER(i.issue_type) = 'bug' OR i.issue_type ILIKE '%bug%' OR i.issue_type ILIKE '%defect%')
    AND i.assignee_id IS NOT NULL
  GROUP BY u.full_name
  ORDER BY bug_count DESC
- Issues with assignee and their other work: SELECT i1.issue_key AS original_issue, i1.title AS original_title,
    u.full_name AS assignee_name,
    i2.issue_key AS other_issue, i2.title AS other_title, i2.status AS other_status
  FROM issues i1 
  JOIN users u ON i1.assignee_id = u.user_id 
  JOIN issues i2 ON u.user_id = i2.assignee_id 
  WHERE i1.issue_key = 'WEB-0017' AND i2.issue_key != 'WEB-0017'
- Issues with reporter: SELECT i.*, u.full_name AS reporter_name FROM issues i JOIN users u ON i.reporter_id = u.user_id
- Comments with author: SELECT ic.*, u.full_name AS author_name FROM issue_comments ic JOIN users u ON ic.author_id = u.user_id

IMPORTANT FILTERING NOTES:
- When filtering by issue_type, status, priority, etc., ALWAYS use case-insensitive matching:
  * WHERE LOWER(issue_type) = 'bug' OR issue_type ILIKE '%bug%' OR issue_type ILIKE '%defect%'
  * This handles variations like 'Bug', 'bug', 'BUG', 'defect', 'Defect', etc.
- Always check for NULL assignees when grouping by assignee:
  * Use WHERE assignee_id IS NOT NULL if you only want assigned issues
  * Or use LEFT JOIN and handle NULLs if you want to include unassigned issues

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

SPECIAL CASE - "Break down by assignee" or "Group by assignee":
When the question asks to break down or group by assignee, you MUST:
1. JOIN users table to get assignee names: JOIN users ON issues.assignee_id = users.user_id
2. Use GROUP BY users.full_name (NOT assignee_id) to group by assignee name
3. SELECT users.full_name AS assignee_name (or similar) to show the name
4. Include aggregations like COUNT(*), SUM(story_points), etc.
5. **CRITICAL: For filtering by issue_type, ALWAYS use case-insensitive matching to handle variations:**
   - Use: WHERE LOWER(i.issue_type) = 'bug' OR i.issue_type ILIKE '%bug%' OR i.issue_type ILIKE '%defect%'
   - This handles 'Bug', 'bug', 'BUG', 'defect', 'Defect', etc.
6. **CRITICAL: Filter out NULL assignees if needed: WHERE i.assignee_id IS NOT NULL**
7. Example structure for "Break down bugs by assignee":
   SELECT 
     u.full_name AS assignee_name,
     COUNT(*) AS bug_count,
     SUM(i.story_points) AS total_story_points,
     STRING_AGG(i.issue_key, ', ' ORDER BY i.issue_key) AS issue_keys
   FROM issues i
   JOIN users u ON i.assignee_id = u.user_id
   WHERE (LOWER(i.issue_type) = 'bug' OR i.issue_type ILIKE '%bug%' OR i.issue_type ILIKE '%defect%')
     AND i.assignee_id IS NOT NULL
   GROUP BY u.full_name
   ORDER BY bug_count DESC
   LIMIT 50

CLARIFICATION EXAMPLES:
- User asks "Show risky sprints" → This is AMBIGUOUS because "risky" is undefined. Respond with:
  {"isAmbiguous": true, "clarification": "What do you mean by 'risky' sprints? For example: sprints with issues past their due date, sprints with low completion rate, sprints with many blocked issues, or sprints that are behind schedule?", "sql": null, "assumptions": []}
- User asks "Show healthy sprints" → This is AMBIGUOUS. Ask for clarification about what "healthy" means.
- User asks "Show all issues in QA status for Avery's team" → This is AMBIGUOUS because "Avery" is only a first name and multiple users may have this first name. Respond with:
  {"isAmbiguous": true, "clarification": "Which Avery are you referring to? There may be multiple users with the first name 'Avery'. Please provide the full name (e.g., 'Avery Hernandez' or 'Avery Smith') or specify additional context like their team or email.", "sql": null, "assumptions": []}
- User asks "Show issues for Avery Hernandez's team" → This is clear, use full name to match users.full_name.
- User asks "Show sprints" → This is clear, generate SQL to show all sprints.
- User asks "Show sprints with issues past due date" → This is clear, generate SQL with appropriate JOINs and filters.

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
            assumptions: Array.isArray(result.assumptions) ? result.assumptions : [],
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
          assumptions: ['Generated SQL from natural language query', 'Applied default LIMIT clause'],
        };
      }
    }

    return {
      sql: null,
      clarification: 'Could not generate SQL from the query. Please rephrase your question.',
      isAmbiguous: true,
      assumptions: [],
    };
  } catch (error: any) {
    // Enhanced error logging and handling
    console.error('Error generating SQL:', {
      message: error.message,
      status: error.status,
      statusCode: error.statusCode,
      type: error.constructor?.name,
      stack: error.stack,
    });

    // Handle specific error types
    if (error.status === 401 || error.statusCode === 401) {
      return {
        sql: null,
        clarification: 'Authentication error: Invalid API key. Please check your configuration.',
        isAmbiguous: true,
        assumptions: [],
      };
    }

    if (error.status === 429 || error.statusCode === 429) {
      return {
        sql: null,
        clarification: 'Rate limit exceeded: Too many requests. Please wait a moment and try again.',
        isAmbiguous: true,
        assumptions: [],
      };
    }

    if (error.status === 500 || error.statusCode === 500) {
      return {
        sql: null,
        clarification: 'AI service error: The AI service is temporarily unavailable. Please try again in a moment.',
        isAmbiguous: true,
        assumptions: [],
      };
    }

    if (error.message?.includes('timeout') || error.message?.includes('network')) {
      return {
        sql: null,
        clarification: 'Network error: Unable to reach AI service. Please check your connection and try again.',
        isAmbiguous: true,
        assumptions: [],
      };
    }

    // Generic error fallback with more context
    const errorMessage = error.message || 'Unknown error';
    return {
      sql: null,
      clarification: `Error generating SQL: ${errorMessage}. Please try again or rephrase your question.`,
      isAmbiguous: true,
      assumptions: [],
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
 * Uses LLM to repair SQL and return assumptions about the fix
 * @param failedSql - The SQL that failed
 * @param errorMessage - The database error message
 * @param schemaContext - Schema information for context
 * @returns Object with repaired SQL and assumptions about the fix
 */
export async function repair_sql(
  failedSql: string,
  errorMessage: string,
  schemaContext: SchemaInfo
): Promise<{ repairedSql: string; assumptions: string[] }> {
  // Check for API key before proceeding
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set');
    return {
      repairedSql: failedSql,
      assumptions: ['SQL repair unavailable: AI service not configured'],
    };
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  const schemaText = JSON.stringify(schemaContext, null, 2);

  const prompt = `You are a SQL repair assistant. Given a failed SQL query, error message, and database schema, repair the SQL and document assumptions about the fix.

DATABASE SCHEMA:
${schemaText}

FAILED SQL:
${failedSql}

ERROR MESSAGE:
${errorMessage}

INSTRUCTIONS:
1. Analyze the error and repair the SQL query
2. Document assumptions about what was fixed
3. Return JSON: {"repairedSql": "SELECT ...", "assumptions": ["assumption 1", "assumption 2"]}

ASSUMPTIONS should include:
- Column name corrections (e.g., "Corrected column name from 'name' to 'full_name'")
- Table name corrections
- Join condition fixes
- Data type adjustments
- Case sensitivity fixes

DO NOT include:
- SQL syntax explanations
- Generic error descriptions
- Performance notes

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
            repairedSql: result.repairedSql || failedSql,
            assumptions: Array.isArray(result.assumptions) ? result.assumptions : [],
          };
        } catch (e) {
          // JSON parse failed
        }
      }
    }

    // Fallback: return original SQL with basic assumption
    return {
      repairedSql: failedSql,
      assumptions: ['Attempted to repair SQL based on error message'],
    };
  } catch (error: any) {
    console.error('Error repairing SQL:', {
      message: error.message,
      status: error.status,
      statusCode: error.statusCode,
      type: error.constructor?.name,
    });
    return {
      repairedSql: failedSql,
      assumptions: [`SQL repair failed: ${error.message || 'Unknown error'}`],
    };
  }
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
  // Check for API key before proceeding
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set');
    // Return a basic explanation without AI
    if (queryResults.error) {
      return `Query execution failed: ${queryResults.error}`;
    }
    return `Found ${queryResults.rowCount} result${queryResults.rowCount !== 1 ? 's' : ''} in ${queryResults.runtimeMs}ms.`;
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic({
    apiKey: apiKey,
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
8. **IMPORTANT: At the end, provide EXACTLY 3 relevant follow-up suggestions as a JSON array in this format:**
   {"explanation": "your explanation text", "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]}
   
   The suggestions MUST be:
   - **EXACTLY 3 suggestions** (not more, not less)
   - **Highly relevant to the current query and results** - based on what was just queried
   - **Contextually appropriate** - if the query was about bugs, suggest bug-related follow-ups
   - **Actionable follow-up questions** the user might want to ask based on the current results
   - **Use actual column names from the schema** (e.g., if schema has "status", "priority", "team_id", use those exact names)
   - **Build on the current query** - if they asked about bugs by assignee, suggest filtering those bugs further
   - Examples of contextually relevant suggestions:
     * If query was about bugs: "Show all bugs grouped by status", "Show bugs with priority = 'p0' or priority = 'p1' from the last month", "Show bugs where assignee_id is not null and status = 'in_progress'"
     * If query was about issues by team: "Break this down by sprint", "Show issues created in the last two weeks", "Filter by priority"
     * If query was about assignees: "Show all issues for this assignee", "Compare assignee workload", "Show assignee's completed issues"
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
    console.error('Error explaining results:', {
      message: error.message,
      status: error.status,
      statusCode: error.statusCode,
      type: error.constructor?.name,
    });
    // Return a basic explanation without AI
    if (queryResults.error) {
      return `Query execution failed: ${queryResults.error}`;
    }
    return `Found ${queryResults.rowCount} result${queryResults.rowCount !== 1 ? 's' : ''} in ${queryResults.runtimeMs}ms.`;
  }
}
