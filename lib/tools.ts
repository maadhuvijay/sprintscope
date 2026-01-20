/**
 * SprintScope Tool Functions
 * 
 * These tools are used by the LLM to interact with the database and process queries.
 * Each tool is a placeholder that will be implemented to handle specific operations.
 */

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
 * get_schema - Returns tables/columns/FKs for grounding
 * @returns Schema information including all tables, columns, and foreign key relationships
 */
export async function get_schema(): Promise<SchemaInfo> {
  // TODO: Implement schema retrieval from Supabase
  // This should query the information_schema or use Supabase's metadata API
  throw new Error('get_schema not yet implemented');
}

/**
 * generate_sql - Converts natural language to SQL (SELECT + LIMIT)
 * @param naturalLanguageQuery - User's question in natural language
 * @param schemaContext - Optional schema information for grounding
 * @returns Generated SQL query with LIMIT clause
 */
export async function generate_sql(
  naturalLanguageQuery: string,
  schemaContext?: SchemaInfo
): Promise<string> {
  // TODO: Implement NL → SQL generation
  // This could use the LLM with the schema context to generate SQL
  throw new Error('generate_sql not yet implemented');
}

/**
 * execute_query - Runs SQL against Supabase
 * @param sql - Validated SQL query to execute
 * @returns Query results, row count, execution time, and any errors
 */
export async function execute_query(sql: string): Promise<QueryResult> {
  // TODO: Implement SQL execution against Supabase
  // This should:
  // 1. Validate SQL using validateSQL() first
  // 2. Execute against Supabase Postgres
  // 3. Return results with metadata
  throw new Error('execute_query not yet implemented');
}

/**
 * repair_sql - Fixes SQL using DB error + schema
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
  // TODO: Implement SQL repair logic
  // This should use the LLM to analyze the error and fix the SQL
  // Input: failed SQL, error message, schema
  // Output: corrected SQL
  throw new Error('repair_sql not yet implemented');
}

/**
 * explain_results - Summarizes results in plain English
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
  // TODO: Implement result explanation
  // This should use the LLM to generate a conversational summary
  // Input: query results, original question, SQL
  // Output: human-readable explanation
  throw new Error('explain_results not yet implemented');
}
