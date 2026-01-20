# SprintScope - Technical Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [System Flow](#system-flow)
6. [Tool Execution Workflow](#tool-execution-workflow)
7. [API Architecture](#api-architecture)
8. [Frontend Components](#frontend-components)
9. [Security & Safety](#security--safety)
10. [Key Features](#key-features)
11. [Deployment](#deployment)

---

## Project Overview

**SprintScope** is an AI-powered natural language interface for querying sprint and issue tracking data. It enables users to interact with their database using conversational queries, automatically generating and executing SQL queries while providing transparent insights into the query process.

### Core Capabilities
- **Natural Language to SQL**: Converts user questions into optimized SQL queries
- **Intelligent Clarification**: Asks for clarification when queries are ambiguous
- **Automatic SQL Repair**: Self-corrects SQL errors using LLM-powered repair
- **Transparent Execution**: Shows generated SQL, results, assumptions, and execution metadata
- **Context-Aware Suggestions**: Provides relevant follow-up questions based on query results

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ ChatConsole  │  │ ModelTrace   │  │  Composer    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │ HTTP POST
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Route (/api/chat)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Sequential Tool Execution Flow               │  │
│  │  1. get_schema()                                     │  │
│  │  2. generate_sql()                                   │  │
│  │  3. execute_query()                                  │  │
│  │  4. repair_sql() [if error]                          │  │
│  │  5. explain_results()                                │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────┬─────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Supabase   │    │  Anthropic   │    │   Tools      │
│  Database   │    │  Claude API  │    │   Library    │
│             │    │              │    │              │
│  - Issues   │    │  - SQL Gen   │    │  - Schema    │
│  - Users    │    │  - SQL Repair│    │  - Validation│
│  - Teams    │    │  - Explain   │    │  - Execution │
│  - Sprints  │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Component Architecture

**Frontend (React/Next.js)**
- **ChatConsole**: Displays conversation history and suggestions
- **ModelTrace**: Shows SQL, results, assumptions, and execution metadata
- **Composer**: Input field for user queries
- **Header**: Application branding and navigation

**Backend (Next.js API Routes)**
- **`/api/chat`**: Main orchestration endpoint for query processing

**Core Libraries**
- **`lib/tools.ts`**: Tool functions (get_schema, generate_sql, execute_query, repair_sql, explain_results)
- **`lib/llm.ts`**: LLM client and validation utilities
- **`lib/utils.ts`**: Shared utility functions

---

## Technology Stack

### Frontend
- **Framework**: Next.js 16.1.4 (React 19.2.3)
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion 12.27.1
- **Icons**: Lucide React
- **Type Safety**: TypeScript 5

### Backend
- **Runtime**: Node.js (Next.js API Routes)
- **Database**: Supabase (PostgreSQL)
- **Database Client**: @supabase/supabase-js 2.45.4

### AI/ML
- **LLM Provider**: Anthropic Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)
- **SDK**: @anthropic-ai/sdk 0.71.2
- **Temperature**: 0.1 (for deterministic SQL generation)

### Data Processing
- **CSV Parsing**: csv-parse 5.5.8
- **Environment**: dotenv 16.6.1

---

## Database Schema

### Core Tables

#### `teams`
- `id` (BIGSERIAL, PK)
- `team_id` (UUID, unique)
- `team_key` (TEXT) - Key identifier (e.g., "ACCEL", "WEB")
- `team_name` (TEXT)
- `created_at` (TIMESTAMPTZ)

#### `users`
- `id` (BIGSERIAL, PK)
- `user_id` (UUID, unique)
- `team_id` (UUID, FK → teams.team_id)
- `full_name` (TEXT) - Full name (e.g., "Avery Hernandez")
- `email` (TEXT)
- `created_at` (TIMESTAMPTZ)

#### `issues`
- `id` (BIGSERIAL, PK)
- `issue_id` (UUID, unique)
- `issue_key` (TEXT) - Contains team identifier (e.g., "ACCEL-0013", "WEB-0017")
- `team_id` (UUID, FK → teams.team_id)
- `sprint_id` (UUID, FK → sprints.sprint_id)
- `assignee_id` (UUID, FK → users.user_id)
- `reporter_id` (UUID, FK → users.user_id)
- `title` (TEXT)
- `description` (TEXT)
- `issue_type` (TEXT) - e.g., "Bug", "Story", "Task"
- `status` (TEXT) - e.g., "In Progress", "QA", "Done"
- `priority` (TEXT) - e.g., "p0", "p1", "p2"
- `story_points` (INTEGER)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `resolved_at` (TIMESTAMPTZ)

#### `sprints`
- `id` (BIGSERIAL, PK)
- `sprint_id` (UUID, unique)
- `team_id` (UUID, FK → teams.team_id)
- `sprint_name` (TEXT) - e.g., "Sprint 01", "Sprint 02"
- `start_date` (DATE)
- `end_date` (DATE)
- `goal` (TEXT)
- `created_at` (TIMESTAMPTZ)

#### `issue_status_events`
- `id` (BIGSERIAL, PK)
- `event_id` (UUID, unique)
- `issue_id` (UUID, FK → issues.issue_id)
- `from_status` (TEXT)
- `to_status` (TEXT)
- `changed_at` (TIMESTAMPTZ)

#### `issue_comments`
- `id` (BIGSERIAL, PK)
- `comment_id` (UUID, unique)
- `issue_id` (UUID, FK → issues.issue_id)
- `author_id` (UUID, FK → users.user_id)
- `body` (TEXT)
- `created_at` (TIMESTAMPTZ)

### Key Relationships
- `issues.team_id` → `teams.team_id`
- `issues.assignee_id` → `users.user_id`
- `issues.reporter_id` → `users.user_id`
- `issues.sprint_id` → `sprints.sprint_id`
- `users.team_id` → `teams.team_id`
- `issue_comments.author_id` → `users.user_id`
- `issue_comments.issue_id` → `issues.issue_id`

### Special Patterns
- **Team Identification**: `issue_key` contains team identifier (e.g., "ACCEL-0013" = Team ACCEL)
- **User Names**: Always use `full_name` (not first name alone) to avoid ambiguity

---

## System Flow

### End-to-End Query Flow

```
1. User Input
   └─> User types query in Composer component
       Example: "Show all issues in QA status for Team ACCEL"

2. Frontend Request
   └─> POST /api/chat
       Body: { message: "Show all issues...", chatHistory: [...] }

3. API Route Processing
   └─> app/api/chat/route.ts
       ├─> Step 1: get_schema()
       ├─> Step 2: generate_sql()
       ├─> Step 3: Check ambiguity → return clarification if needed
       ├─> Step 4: execute_query()
       ├─> Step 5: repair_sql() [if error] → retry execute_query()
       ├─> Step 6: explain_results()
       └─> Step 7: Return JSON response

4. Response Processing
   └─> Frontend receives:
       {
         response: "Team ACCEL has 4 issues in QA...",
         sql: "SELECT ...",
         results: [...],
         assumptions: [...],
         suggestions: [...]
       }

5. UI Update
   └─> ChatConsole: Display assistant response
   └─> ModelTrace: Display SQL, results, assumptions
   └─> Suggestions: Show 3 contextually relevant follow-ups
```

---

## Tool Execution Workflow

### Sequential Tool Flow

The system follows a strict sequential workflow for each query:

#### Step 1: `get_schema()`
**Purpose**: Retrieve database schema information
- Queries `information_schema` tables
- Extracts table names, columns, data types, foreign keys
- Falls back to hardcoded schema if query fails
- Returns: `SchemaInfo` object with tables and relationships

**Implementation**: `lib/tools.ts::get_schema()`

#### Step 2: `generate_sql()`
**Purpose**: Convert natural language to SQL
- Uses Anthropic Claude Sonnet 4.5
- Receives: user query + schema context
- Generates: SQL SELECT query with LIMIT clause
- Handles ambiguity detection
- Returns: `{ sql, clarification, isAmbiguous, assumptions }`

**Key Features**:
- Automatic JOIN generation for multi-table queries
- Case-insensitive matching for issue types
- Team filtering via `issue_key` pattern matching
- Full name requirement for user queries
- Clarification for ambiguous metrics ("risky", "healthy", etc.)

**Implementation**: `lib/tools.ts::generate_sql()`

**Prompt Engineering**:
- Includes full schema JSON
- Table relationship descriptions
- JOIN examples
- Clarification examples
- Critical rules for column names and relationships

#### Step 3: Ambiguity Check
**Condition**: `isAmbiguous === true` OR `sql === null`
**Action**: Return clarification response
- Clears query data in frontend
- Shows clarification question
- Provides helpful suggestions

#### Step 4: `execute_query()`
**Purpose**: Execute SQL against Supabase
- Validates SQL (SELECT-only, forbidden keywords, LIMIT enforcement)
- Uses Supabase RPC function `exec_sql` for safe execution
- Falls back to REST API if RPC fails
- Returns: `{ rows, rowCount, runtimeMs, error }`

**Security**:
- Only SELECT statements allowed
- Forbidden keywords blocked: INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE
- LIMIT enforced (default 50, max 500)
- Single statement only

**Implementation**: `lib/tools.ts::execute_query()`

#### Step 5: `repair_sql()` (Conditional)
**Condition**: `execResult.error !== undefined`
**Purpose**: Fix SQL errors using LLM
- Receives: failed SQL, error message, schema context
- Uses Anthropic Claude to analyze error and repair SQL
- Returns: `{ repairedSql, assumptions }`
- Retries: `execute_query()` with repaired SQL

**Implementation**: `lib/tools.ts::repair_sql()`

#### Step 6: `explain_results()`
**Purpose**: Generate human-readable explanation
- Uses Anthropic Claude Sonnet 4.5
- Receives: query results, original query, SQL, schema
- Generates: natural language explanation + 3 contextually relevant suggestions
- Returns: JSON with `{ explanation, suggestions }`

**Implementation**: `lib/tools.ts::explain_results()`

#### Step 7: Response Assembly
**Returns**:
```json
{
  "response": "Team ACCEL has 4 issues in QA...",
  "sql": "SELECT ...",
  "results": [...],
  "rowCount": 4,
  "runtimeMs": 123,
  "suggestions": ["...", "...", "..."],
  "assumptions": ["...", "..."],
  "toolCalls": ["get_schema", "generate_sql", "execute_query", "explain_results"]
}
```

---

## API Architecture

### Endpoint: `POST /api/chat`

**Request Body**:
```typescript
{
  message: string;           // User's natural language query
  chatHistory?: Array<{     // Optional chat history
    role: "user" | "assistant";
    content: string;
  }>;
}
```

**Response**:
```typescript
{
  response: string;          // Assistant's explanation
  sql: string | null;       // Generated SQL query
  results: any[];           // Query results
  rowCount: number;         // Number of rows returned
  runtimeMs: number;        // Query execution time
  error?: string;           // Error message (if any)
  suggestions: string[];    // 3 contextually relevant suggestions
  assumptions: string[];   // Assumptions made during query generation
  toolCalls: string[];      // List of tools executed
}
```

**Error Handling**:
- 400: Missing message
- 500: Internal server error with error message

**Implementation**: `app/api/chat/route.ts`

---

## Frontend Components

### 1. `ChatConsole` (`components/ChatConsole.tsx`)

**Purpose**: Display conversation history and suggestions

**Features**:
- Message bubbles (user: cyan border, assistant: purple border)
- Auto-scrolling to latest message
- Loading indicator with hourglass animation
- Contextual suggestions (3 per response)
- Initial welcome message with 5 predefined questions
- Formatted text with syntax highlighting for issue keys, story points, priorities

**Props**:
```typescript
{
  messages: Message[];
  onSuggestionClick?: (suggestion: string) => void;
  isLoading?: boolean;
}
```

**Key Functions**:
- `AssistantText`: Formats assistant responses with highlighting
- `formatInlineText`: Highlights issue keys, story points, priorities, bold text

### 2. `ModelTrace` (`components/ModelTrace.tsx`)

**Purpose**: Display SQL, results, assumptions, and execution metadata

**Features**:
- Tabbed interface (SQL / Results)
- SQL syntax highlighting and formatting
- Dynamic table rendering for results
- Horizontal scrolling for wide tables
- Themed scrollbars matching application design
- Collapsible Assumptions section
- Collapsible Execution section (status, rows, runtime, DB)
- Copy SQL to clipboard
- Export results to CSV

**Props**:
```typescript
{
  sql?: string | null;
  results?: any[];
  rowCount?: number;
  runtimeMs?: number;
  error?: string;
  assumptions?: string[];
}
```

**Key Functions**:
- `formatSQL`: Formats and highlights SQL syntax
- `getColumns`: Extracts column names from results
- `exportToCSV`: Exports results to CSV file

### 3. `Composer` (`components/Composer.tsx`)

**Purpose**: Input field for user queries

**Features**:
- Text input with placeholder
- Run Query button
- Reset button (clears conversation)
- Disabled state during loading
- Keyboard shortcut (Enter to submit)

**Props**:
```typescript
{
  onRunQuery: (query: string) => void;
  onReset: () => void;
  isLoading?: boolean;
}
```

### 4. `Header` (`components/Header.tsx`)

**Purpose**: Application branding and navigation

**Features**:
- SprintScope logo/branding
- Consistent styling with application theme

### 5. Main Page (`app/page.tsx`)

**Purpose**: Main application container

**Features**:
- State management for messages and query data
- API integration (`/api/chat`)
- Layout: 62% chat console, 38% model trace
- Glass panel design with neon borders
- Responsive design

**State**:
```typescript
{
  messages: Message[];
  isLoading: boolean;
  queryData: QueryData | null;
}
```

---

## Security & Safety

### SQL Injection Prevention

1. **Read-Only Mode**: Only SELECT statements allowed
2. **Keyword Blocking**: Forbidden keywords rejected:
   - INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE
3. **Single Statement**: Multiple statements (semicolons) rejected
4. **LIMIT Enforcement**: Default 50, maximum 500 rows
5. **RPC Function**: Uses Supabase `exec_sql` function with built-in validation

### Input Validation

1. **Message Required**: API rejects requests without message
2. **Column Name Verification**: LLM checks schema before using column names
3. **Table Name Verification**: Only known tables allowed

### Data Privacy

1. **No Data Modification**: System cannot modify data
2. **No Secrets Exposure**: LLM prompts don't expose credentials
3. **RLS Policies**: Supabase Row Level Security enabled (configurable)

### Clarification for Ambiguity

System asks for clarification when:
- Undefined metrics ("risky", "healthy", "stuck")
- Ambiguous time references ("recent", "last sprint")
- First names only (multiple users may match)
- Missing scope (team, sprint, status)

---

## Key Features

### 1. Natural Language to SQL
- Converts conversational queries to optimized SQL
- Handles complex multi-table JOINs automatically
- Understands team relationships via `issue_key` pattern matching

### 2. Intelligent Clarification
- Detects ambiguous queries
- Asks specific clarification questions
- Provides helpful examples

### 3. Automatic SQL Repair
- Self-corrects SQL errors
- Uses LLM to analyze error messages
- Retries with repaired SQL

### 4. Transparent Execution
- Shows generated SQL with syntax highlighting
- Displays query results in formatted tables
- Lists assumptions made during query generation
- Shows execution metadata (runtime, row count, status)

### 5. Context-Aware Suggestions
- Generates 3 relevant follow-up questions
- Based on query context and results
- Uses actual column names from schema

### 6. Smart Name Handling
- Requires full names for user queries
- Clarifies when only first name provided
- Handles team identification via `issue_key`

### 7. Case-Insensitive Matching
- Handles variations in issue types ("Bug", "bug", "BUG")
- Flexible status matching
- Team name matching

---

## Deployment

### Environment Variables

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### Database Setup

1. **Run Migrations**: Execute SQL migrations in `supabase/migrations/`
2. **Upload Data**: Use upload scripts in `scripts/` directory
3. **Configure RLS**: Set up Row Level Security policies

### Build & Deploy

```bash
# Development
npm run dev

# Production Build
npm run build
npm start

# Deploy to Vercel
vercel deploy
```

### Supabase Setup

1. Create Supabase project
2. Run migrations in order:
   - `001_create_teams_table.sql`
   - `002_setup_rls_policies.sql`
   - `005_create_issues_table.sql`
   - `006_setup_issues_rls_policies.sql`
   - `007_create_sprints_table.sql`
   - `008_setup_sprints_rls_policies.sql`
   - `009_create_issue_status_events_table.sql`
   - `010_setup_issue_status_events_rls_policies.sql`
   - `011_create_issue_comments_table.sql`
   - `012_setup_issue_comments_rls_policies.sql`
   - `013_create_exec_sql_function.sql`

3. Upload data:
   ```bash
   npm run upload:users
   npm run upload:teams
   npm run upload:issues
   npm run upload:sprints
   npm run upload:issue-status-events
   npm run upload:issue-comments
   ```

---

## Future Enhancements

### Potential Improvements
1. **Streaming Responses**: Real-time token streaming for better UX
2. **Query History**: Save and replay previous queries
3. **Export Options**: PDF, Excel export formats
4. **Visualizations**: Charts and graphs for query results
5. **Multi-User Support**: User authentication and query history
6. **Query Optimization**: Caching frequently used queries
7. **Advanced Filtering**: UI-based query builder
8. **Notifications**: Alert on specific query conditions

---

## Conclusion

SprintScope demonstrates a production-ready architecture for AI-powered database querying with:
- **Robust Security**: Multiple layers of SQL injection prevention
- **Intelligent Processing**: LLM-powered SQL generation and repair
- **Transparent Execution**: Full visibility into query process
- **User-Friendly Interface**: Natural language interaction with helpful suggestions
- **Scalable Architecture**: Modular design with clear separation of concerns

The system successfully bridges the gap between natural language and SQL, making database querying accessible to non-technical users while maintaining security and performance.

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-27  
**Author**: SprintScope Development Team
