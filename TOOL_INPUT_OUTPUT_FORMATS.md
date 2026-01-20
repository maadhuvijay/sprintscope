# Tool Input/Output Formats

This document details the exact input and output formats for each tool in the SprintScope system.

---

## Tool 1: `get_schema()`

### Input
**No parameters** - This tool takes no input.

```typescript
get_schema(): Promise<SchemaInfo>
```

### Output

**Type**: `Promise<SchemaInfo>`

**SchemaInfo Interface**:
```typescript
interface SchemaInfo {
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
```

**Example Output**:
```json
{
  "tables": [
    {
      "name": "issues",
      "columns": [
        {
          "name": "issue_id",
          "type": "uuid",
          "nullable": false
        },
        {
          "name": "issue_key",
          "type": "text",
          "nullable": false
        },
        {
          "name": "title",
          "type": "text",
          "nullable": false
        },
        {
          "name": "status",
          "type": "text",
          "nullable": true
        }
      ]
    },
    {
      "name": "users",
      "columns": [
        {
          "name": "user_id",
          "type": "uuid",
          "nullable": false
        },
        {
          "name": "full_name",
          "type": "text",
          "nullable": false
        }
      ]
    }
  ],
  "foreignKeys": [
    {
      "fromTable": "issues",
      "fromColumn": "assignee_id",
      "toTable": "users",
      "toColumn": "user_id"
    },
    {
      "fromTable": "issues",
      "fromColumn": "team_id",
      "toTable": "teams",
      "toColumn": "team_id"
    }
  ]
}
```

---

## Tool 2: `generate_sql()`

### Input

**Parameters**:
```typescript
generate_sql(
  naturalLanguageQuery: string,
  schemaContext: SchemaInfo
): Promise<GenerateSQLResult>
```

**Parameters**:
- `naturalLanguageQuery` (string): The user's natural language question
  - Example: `"Show all issues in QA status for Team ACCEL"`
- `schemaContext` (SchemaInfo): The schema information from `get_schema()`

### Output

**Type**: `Promise<{ sql: string | null; clarification: string | null; isAmbiguous: boolean; assumptions: string[] }>`

**GenerateSQLResult Interface**:
```typescript
interface GenerateSQLResult {
  sql: string | null;              // Generated SQL query (null if ambiguous)
  clarification: string | null;    // Clarification question (null if not ambiguous)
  isAmbiguous: boolean;            // Whether the query is ambiguous
  assumptions: string[];           // Assumptions made during generation
}
```

**Example Output (Success)**:
```json
{
  "sql": "SELECT i.*, t.team_key, t.team_name FROM issues i JOIN teams t ON i.team_id = t.team_id WHERE i.status ILIKE '%QA%' AND (i.issue_key ILIKE 'ACCEL-%' OR i.issue_key ILIKE '%ACCEL%') LIMIT 50",
  "clarification": null,
  "isAmbiguous": false,
  "assumptions": [
    "Interpreted 'QA status' as status containing 'QA' (case-insensitive)",
    "Matched Team ACCEL using issue_key pattern matching",
    "Applied default result limit of 50 rows"
  ]
}
```

**Example Output (Ambiguous)**:
```json
{
  "sql": null,
  "clarification": "Which Avery are you referring to? There may be multiple users with the first name 'Avery'. Please provide the full name (e.g., 'Avery Hernandez' or 'Avery Smith') or specify additional context like their team or email.",
  "isAmbiguous": true,
  "assumptions": []
}
```

**Example Output (Error)**:
```json
{
  "sql": null,
  "clarification": "Error generating SQL. Please try again.",
  "isAmbiguous": true,
  "assumptions": []
}
```

---

## Tool 3: `execute_query()`

### Input

**Parameters**:
```typescript
execute_query(sql: string): Promise<QueryResult>
```

**Parameters**:
- `sql` (string): The SQL query to execute
  - Example: `"SELECT * FROM issues WHERE status = 'In Progress' LIMIT 50"`

### Output

**Type**: `Promise<QueryResult>`

**QueryResult Interface**:
```typescript
interface QueryResult {
  rows: any[];           // Array of result rows (objects with column names as keys)
  rowCount: number;      // Number of rows returned
  runtimeMs: number;     // Query execution time in milliseconds
  error?: string;        // Error message (if execution failed)
}
```

**Example Output (Success)**:
```json
{
  "rows": [
    {
      "issue_id": "550e8400-e29b-41d4-a716-446655440000",
      "issue_key": "ACCEL-0013",
      "title": "Improve onboarding: reporting",
      "status": "In Progress",
      "assignee_id": "660e8400-e29b-41d4-a716-446655440001",
      "story_points": 8,
      "priority": "p2"
    },
    {
      "issue_id": "550e8400-e29b-41d4-a716-446655440002",
      "issue_key": "ACCEL-0003",
      "title": "UI calculation fix",
      "status": "In Progress",
      "assignee_id": "660e8400-e29b-41d4-a716-446655440003",
      "story_points": null,
      "priority": "p0"
    }
  ],
  "rowCount": 2,
  "runtimeMs": 45
}
```

**Example Output (Error)**:
```json
{
  "rows": [],
  "rowCount": 0,
  "runtimeMs": 12,
  "error": "column s.name does not exist"
}
```

**Example Output (Validation Error)**:
```json
{
  "rows": [],
  "rowCount": 0,
  "runtimeMs": 1,
  "error": "Forbidden keyword detected: INSERT. Only SELECT queries are allowed in read-only mode."
}
```

---

## Tool 4: `repair_sql()`

### Input

**Parameters**:
```typescript
repair_sql(
  failedSql: string,
  errorMessage: string,
  schemaContext: SchemaInfo
): Promise<RepairSQLResult>
```

**Parameters**:
- `failedSql` (string): The SQL query that failed
  - Example: `"SELECT s.name FROM sprints s LIMIT 50"`
- `errorMessage` (string): The error message from the database
  - Example: `"column s.name does not exist"`
- `schemaContext` (SchemaInfo): The schema information from `get_schema()`

### Output

**Type**: `Promise<{ repairedSql: string; assumptions: string[] }>`

**RepairSQLResult Interface**:
```typescript
interface RepairSQLResult {
  repairedSql: string;    // The repaired SQL query
  assumptions: string[];  // Assumptions made during repair
}
```

**Example Output**:
```json
{
  "repairedSql": "SELECT s.sprint_name FROM sprints s LIMIT 50",
  "assumptions": [
    "Fixed column name: changed 's.name' to 's.sprint_name' (sprints table uses sprint_name, not name)"
  ]
}
```

---

## Tool 5: `explain_results()`

### Input

**Parameters**:
```typescript
explain_results(
  queryResults: QueryResult,
  originalQuery: string,
  sql: string,
  schemaContext: SchemaInfo
): Promise<string>
```

**Parameters**:
- `queryResults` (QueryResult): The results from `execute_query()`
- `originalQuery` (string): The user's original natural language query
  - Example: `"What work is still in progress for Team ACCEL?"`
- `sql` (string): The SQL query that was executed
  - Example: `"SELECT * FROM issues WHERE status ILIKE '%In Progress%' AND issue_key ILIKE 'ACCEL-%' LIMIT 50"`
- `schemaContext` (SchemaInfo): The schema information from `get_schema()`

### Output

**Type**: `Promise<string>`

**Format**: The output is a string that may be:
1. **Plain text explanation** (most common)
2. **JSON string** with `explanation` and `suggestions` fields

**Example Output (Plain Text)**:
```
Team ACCEL currently has 4 issues in progress. The most recently updated is ACCEL-0013 'Improve onboarding: reporting' (8 story points), assigned to Avery Hernandez and last updated on October 18th. The other in-progress items include a UI calculation fix by Sophia Gonzalez (no story points assigned), an auth search feature by Levi Walker (13 story points), and a high-priority reporting filter by Avery Hernandez (1 story point, priority p0).
```

**Example Output (JSON String)**:
```json
{
  "explanation": "Team ACCEL currently has 4 issues in progress. The most recently updated is ACCEL-0013 'Improve onboarding: reporting' (8 story points), assigned to Avery Hernandez and last updated on October 18th.",
  "suggestions": [
    "Show all issues assigned to Team ACCEL",
    "Break down in-progress issues by assignee",
    "Show issues completed in the last sprint"
  ]
}
```

**Note**: The API route (`app/api/chat/route.ts`) parses this output and handles both formats, extracting suggestions when available.

---

## Complete Tool Flow Example

### Step-by-Step Example

**1. get_schema()**
```typescript
const schema = await get_schema();
// Returns: SchemaInfo with tables and foreignKeys
```

**2. generate_sql()**
```typescript
const result = await generate_sql(
  "Show all issues in QA status for Team ACCEL",
  schema
);
// Returns: {
//   sql: "SELECT ...",
//   clarification: null,
//   isAmbiguous: false,
//   assumptions: [...]
// }
```

**3. execute_query()**
```typescript
const execResult = await execute_query(result.sql);
// Returns: {
//   rows: [...],
//   rowCount: 4,
//   runtimeMs: 45,
//   error: undefined
// }
```

**4. repair_sql()** (only if error occurred)
```typescript
if (execResult.error) {
  const repairResult = await repair_sql(
    result.sql,
    execResult.error,
    schema
  );
  // Returns: {
  //   repairedSql: "SELECT ...",
  //   assumptions: [...]
  // }
  
  // Retry execution
  execResult = await execute_query(repairResult.repairedSql);
}
```

**5. explain_results()**
```typescript
const explanation = await explain_results(
  execResult,
  "Show all issues in QA status for Team ACCEL",
  result.sql,
  schema
);
// Returns: "Team ACCEL has 4 issues in QA status..."
```

---

## Type Definitions Summary

### Core Types

```typescript
// Schema Information
interface SchemaInfo {
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

// Query Execution Result
interface QueryResult {
  rows: any[];
  rowCount: number;
  runtimeMs: number;
  error?: string;
}

// SQL Generation Result
interface GenerateSQLResult {
  sql: string | null;
  clarification: string | null;
  isAmbiguous: boolean;
  assumptions: string[];
}

// SQL Repair Result
interface RepairSQLResult {
  repairedSql: string;
  assumptions: string[];
}
```

---

## Error Handling

All tools handle errors gracefully:

1. **get_schema()**: Falls back to hardcoded schema if database query fails
2. **generate_sql()**: Returns `isAmbiguous: true` with clarification message on error
3. **execute_query()**: Returns error in `error` field, empty rows array
4. **repair_sql()**: Always returns repaired SQL (may not be perfect)
5. **explain_results()**: Returns error message as string if LLM call fails

---

## Notes

- All tools are **async functions** returning `Promise<T>`
- All string inputs are **case-sensitive** unless specified otherwise
- SQL queries are **validated** before execution (SELECT-only, LIMIT enforced)
- **Assumptions** are always returned as an array of strings
- **Error messages** are descriptive and actionable
- Tool outputs are **typed** with TypeScript interfaces for type safety

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-27
