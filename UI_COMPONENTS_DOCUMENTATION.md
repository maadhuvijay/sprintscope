# UI Components Documentation

This document provides a comprehensive overview of all UI components in the SprintScope application, detailing their functionalities, props, state management, and user interactions.

---

## Table of Contents

1. [Component Overview](#component-overview)
2. [ChatConsole Component](#chatconsole-component)
3. [ModelTrace Component](#modeltrace-component)
4. [Composer Component](#composer-component)
5. [Header Component](#header-component)
6. [Main Page Component](#main-page-component)
7. [Component Interactions](#component-interactions)
8. [Styling & Theming](#styling--theming)

---

## Component Overview

The SprintScope UI consists of 5 main components:

```
┌─────────────────────────────────────────────────────────┐
│                    Header Component                      │
├──────────────────────┬──────────────────────────────────┤
│                      │                                  │
│   ChatConsole        │      ModelTrace                  │
│   (62% width)        │      (38% width)                │
│                      │                                  │
│   - Messages         │   - SQL Tab                      │
│   - Suggestions      │   - Results Tab                 │
│   - Loading State    │   - Assumptions                  │
│                      │   - Execution Metadata           │
│                      │                                  │
├──────────────────────┴──────────────────────────────────┤
│                  Composer Component                      │
│            (Input field + Action buttons)                │
└─────────────────────────────────────────────────────────┘
```

---

## ChatConsole Component

**File**: `components/ChatConsole.tsx`

### Purpose
Displays the conversation history between the user and the assistant, including messages, suggestions, and loading states.

### Props Interface
```typescript
interface ChatConsoleProps {
  messages: Message[];                    // Array of conversation messages
  onSuggestionClick?: (suggestion: string) => void;  // Callback for suggestion clicks
  isLoading?: boolean;                    // Loading state indicator
}

interface Message {
  role: "user" | "assistant";
  content: string;
  isInitial?: boolean;                     // Marks the initial welcome message
  suggestions?: string[];                  // Array of suggestion strings
}
```

### Key Functionalities

#### 1. Message Display
- **User Messages**: 
  - Displayed with cyan border (`neon-border-cyan`)
  - Right-aligned (`ml-auto`)
  - Max width: 90%
  - White text color

- **Assistant Messages**:
  - Displayed with purple border (`neon-border-purple`)
  - Left-aligned (`mr-auto`)
  - Max width: 95%
  - Gray text color (`text-gray-200`)
  - Includes "ASSISTANT" label at top

#### 2. Auto-Scrolling
- Automatically scrolls to bottom when new messages are added
- Uses `useEffect` hook to monitor message changes
- Smooth scroll behavior with 100ms delay for DOM updates
- Scroll container ref: `scrollContainerRef`

#### 3. Message Formatting (`AssistantText` Component)
- **Paragraph Splitting**: 
  - Splits content by double newlines (`\n\n+`)
  - For long single paragraphs (>200 chars), splits by sentence boundaries
  - Groups 2-3 sentences per paragraph for readability

- **Text Highlighting** (`formatInlineText` function):
  - **Bold Text** (`**text**`): Highlighted in neon-pink with medium font weight
  - **Issue Keys** (e.g., `ACCEL-0013`): Highlighted in neon-cyan, monospace font, semibold
  - **Story Points** (e.g., "8 story points"): Highlighted in neon-amber, medium font weight
  - **Priority** (e.g., "priority p0"): Highlighted in neon-purple, medium font weight

- **List Formatting**:
  - Detects bullet points (`-`, `•`, `*`) and numbered lists (`1.`, `2.`)
  - Formats with cyan bullet points and proper indentation

#### 4. Suggestions Display
- **Initial Message Suggestions** (when `isInitial: true`):
  - Title: "Try asking something like:"
  - Fixed 5 questions:
    1. "What issues are blocked in the current sprint?"
    2. "Show all issues assigned to Team ACCEL"
    3. "Which users have the most open issues?"
    4. "What issues are in QA status for Team ACCEL?"
    5. "Show issues completed in the last sprint"

- **Dynamic Suggestions** (for other messages):
  - Title: "If you'd like, I can:"
  - Uses `message.suggestions` array (up to 3 suggestions)
  - Falls back to default suggestions if none provided:
    - "Break this down by team"
    - "Compare with previous sprint"
    - "Export this view"

- **Suggestion Interaction**:
  - Clickable with hover effects
  - Cyan bullet point with glow effect
  - Text changes to neon-cyan on hover
  - Calls `onSuggestionClick` callback when clicked

#### 5. Loading Indicator
- **Display Condition**: Shown when `isLoading === true`
- **Visual Elements**:
  - Animated spinner (Loader2 icon) in neon-purple
  - Pulsing glow effect around spinner
  - Hourglass icon with pulse animation
  - Text: "Working on it..." and "Analyzing your data and generating response"
- **Animation**: Fade in/out with slide effect using Framer Motion

#### 6. Animations
- **Message Entry**: Fade in with upward slide (opacity: 0 → 1, y: 10 → 0)
- **Transition Duration**: 300ms
- **Loading Indicator**: AnimatePresence for enter/exit animations

### State Management
- Uses React refs for scroll container (`scrollContainerRef`)
- No internal state (stateless component)
- Relies on props for all data

### Styling Features
- Glass card effect with backdrop blur
- Neon border effects (cyan for user, purple for assistant)
- Custom scrollbar hidden (`no-scrollbar` class)
- Responsive spacing and padding

---

## ModelTrace Component

**File**: `components/ModelTrace.tsx`

### Purpose
Displays the technical details of query execution: SQL code, query results, assumptions, and execution metadata.

### Props Interface
```typescript
interface ModelTraceProps {
  sql?: string | null;           // Generated SQL query
  results?: any[];                // Query result rows
  rowCount?: number;              // Total number of rows
  runtimeMs?: number;             // Query execution time in milliseconds
  error?: string;                 // Error message (if any)
  assumptions?: string[];         // Array of assumptions made during query generation
}
```

### Key Functionalities

#### 1. Tabbed Interface
- **Two Tabs**: "SQL" and "Results"
- **Tab Switching**: Click to switch between tabs
- **Active Tab Styling**: 
  - Background: `bg-neon-purple/20`
  - Text: `text-neon-purple`
  - Glow effect: `shadow-[0_0_15px_rgba(139,92,246,0.2)]`
- **Auto-Switch Logic**:
  - Switches to "Results" tab when results are available
  - Switches to "SQL" tab when only SQL is available

#### 2. SQL Tab Features

##### SQL Display
- **Syntax Highlighting**:
  - **Keywords** (SELECT, FROM, WHERE, JOIN, etc.): Neon-pink, semibold
  - **Numbers**: Neon-amber
  - **Strings**: Neon-amber
  - **Operators** (=, <, >, etc.): Neon-cyan
  - **Punctuation** (, ; ( )): White/60 opacity
  - **Other text**: White/90 opacity

- **SQL Formatting** (`formatSQLString` function):
  - Adds line breaks after major keywords (SELECT, FROM, WHERE, JOIN, etc.)
  - Proper indentation (2 spaces per level)
  - Handles SELECT clause column lists (one per line)
  - Formats WHERE conditions with proper line breaks
  - Handles JOIN clauses with indentation

- **File Header Simulation**:
  - macOS-style window controls (red, amber, green dots)
  - "query.sql" filename display
  - Monospace font

##### Copy to Clipboard
- **Copy Button**: Top-right corner of SQL tab
- **Icon**: Copy icon (changes to CheckCircle2 when copied)
- **Functionality**: 
  - Copies SQL to clipboard using `navigator.clipboard.writeText()`
  - Shows checkmark for 2 seconds after copying
  - Visual feedback with color change

##### Safety Check Footer
- **Status Display**:
  - Success: Green checkmark with "Safety Check Passed"
  - Error: Red alert icon with "Error"
- **Safety Indicators**:
  - "SELECT-only" badge
  - "LIMIT applied" badge
- **Color Coding**:
  - Green background for success
  - Red background for errors

#### 3. Results Tab Features

##### Results Table
- **Dynamic Column Detection**: Extracts column names from first result row
- **Table Structure**:
  - Sticky header (stays visible when scrolling)
  - Alternating row hover effects
  - Responsive column widths

- **Data Formatting**:
  - **Numbers**: Right-aligned, displayed as-is
  - **Strings**: Left-aligned, neon-cyan color, medium font weight
  - **NULL values**: Displayed as "NULL" string

- **Horizontal Scrolling**:
  - Themed scrollbar matching application design
  - Scrollbar styling:
    - Width: 8px
    - Gradient thumb (purple to cyan)
    - Glow effect on hover
    - Rounded corners

##### Export to CSV
- **Button**: "Export CSV" in results header
- **Functionality**:
  - Converts results array to CSV format
  - Handles commas in string values (wraps in quotes)
  - Creates downloadable file: `query_results.csv`
  - Uses Blob API for file creation

##### Empty States
- **No Query**: Shows database icon with "No query executed yet"
- **No Results**: Shows database icon with "No results"
- **Error State**: Shows alert icon with error message in red

##### Row Count Display
- Footer shows: "Showing X of Y results"
- Handles singular/plural correctly

#### 4. Assumptions Section
- **Display Condition**: Only shown when `assumptions.length > 0`
- **Collapsible**: Accordion-style with expand/collapse
- **Header**:
  - Hash icon in neon-purple
  - "Assumptions" label
  - Count badge showing number of assumptions
  - Chevron icon (rotates when expanded)

- **Content**:
  - Each assumption displayed as bullet point
  - Purple dot indicator
  - Small text (11px) in gray
  - Relaxed line height

- **Animation**: Smooth height transition with opacity fade

#### 5. Execution Section
- **Always Visible**: Unlike assumptions, always displayed
- **Collapsible**: Accordion-style (default: expanded)
- **Header**:
  - Database icon in neon-amber
  - "Execution" label
  - Chevron icon

- **Metadata Grid** (2x2 grid):
  - **Status**: Success (green checkmark) or Error (red alert)
  - **Rows**: Number of rows returned (Hash icon)
  - **Runtime**: Execution time in milliseconds (Clock icon), shows "—" if 0
  - **DB**: Database name "Supabase" (Database icon)

- **ExecutionItem Component**:
  - Icon + label + value layout
  - Small text sizes (8px label, 10px value)
  - Monospace font for values
  - Glass card background

#### 6. State Management
```typescript
const [activeTab, setActiveTab] = useState<"SQL" | "Results">("SQL");
const [assumptionsOpen, setAssumptionsOpen] = useState(false);
const [executionOpen, setExecutionOpen] = useState(true);
const [copied, setCopied] = useState(false);
```

#### 7. Helper Functions

##### `formatSQL(sqlText: string)`
- Formats SQL with indentation
- Applies syntax highlighting
- Returns React nodes with styled spans

##### `formatSQLString(sql: string)`
- Pure string formatting function
- Adds line breaks and indentation
- Handles complex SQL structures

##### `getColumns()`
- Extracts column names from results array
- Returns empty array if no results

---

## Composer Component

**File**: `components/Composer.tsx`

### Purpose
Provides the input interface for users to enter queries and trigger actions.

### Props Interface
```typescript
interface ComposerProps {
  onRunQuery: (query: string) => void;    // Callback when query is submitted
  onReset: () => void;                     // Callback when reset is clicked
  isLoading?: boolean;                     // Loading state
}
```

### Key Functionalities

#### 1. Input Field
- **Type**: Text input
- **Placeholder**: "Ask a question about your sprint data..."
- **Styling**:
  - Glass effect background (`bg-white/5`)
  - Border with focus effects
  - Rounded corners (2xl)
  - Padding: px-6 py-4
  - Text size: sm

- **Focus Effects**:
  - Border changes to neon-purple/40
  - Ring effect with neon-purple
  - Gradient glow effect (purple to cyan) on focus
  - Smooth transitions

#### 2. Form Submission
- **Submit Method**: Form `onSubmit` handler
- **Validation**: 
  - Only submits if input is not empty (trimmed)
  - Disabled during loading state
- **Behavior**:
  - Calls `onRunQuery(input)` callback
  - Clears input field after submission
  - Prevents default form submission

#### 3. Run Query Button
- **States**:
  - **Active** (input has text, not loading):
    - Gradient background (purple to cyan)
    - White text
    - Glow effect
    - Send icon
    - Hover: white overlay slide effect
  
  - **Disabled** (empty input or loading):
    - Gray background
    - Muted text color
    - "Running..." text when loading
    - Cursor: not-allowed

- **Styling**:
  - Rounded corners (xl)
  - Uppercase text
  - Bold font
  - Wide tracking
  - Relative positioning for overlay effect

#### 4. Reset Button
- **Position**: Left side of input field
- **Icon**: RotateCcw (counter-clockwise arrow)
- **Styling**:
  - Small text (xs)
  - Uppercase
  - Muted colors (white/30)
  - Hover: brighter (white/60)
  - Wide tracking

- **Functionality**:
  - Calls `onReset()` callback
  - Resets entire conversation state

#### 5. Keyboard Support
- **Enter Key**: Submits form (standard form behavior)
- **Disabled during loading**: Prevents multiple submissions

#### 6. State Management
```typescript
const [input, setInput] = useState("");
```
- Local state for input value
- Controlled component pattern

---

## Header Component

**File**: `components/Header.tsx`

### Purpose
Displays the application branding and header navigation.

### Props
None (stateless component)

### Key Functionalities

#### 1. Logo/Branding
- **Logo Icon**:
  - Square with rounded corners
  - Gradient background (purple to cyan)
  - "SS" initials in white
  - Glow effect: `shadow-[0_0_10px_rgba(139,92,246,0.5)]`
  - Size: 6x6 (24px)

- **Title**:
  - Text: "SprintScope"
  - Gradient text effect (white to white/70)
  - Large size (xl)
  - Semibold font
  - Tight tracking

#### 2. Help Button
- **Icon**: HelpCircle
- **Position**: Right side of header
- **Styling**:
  - Circular button
  - Hover: background change (white/5)
  - Muted colors (white/60)
  - Hover: white
  - Smooth transitions

- **Functionality**: 
  - Currently placeholder (no onClick handler)
  - Can be extended for help/guide functionality

#### 3. Layout
- **Flexbox**: Space between logo and help button
- **Border**: Bottom border with white/5 opacity
- **Padding**: px-6 py-4

---

## Main Page Component

**File**: `app/page.tsx`

### Purpose
Main application container that orchestrates all components and manages global state.

### Key Functionalities

#### 1. State Management
```typescript
const [messages, setMessages] = useState<Message[]>([...]);
const [isLoading, setIsLoading] = useState(false);
const [queryData, setQueryData] = useState<QueryData | null>(null);
```

- **Messages**: Array of conversation messages
- **Loading**: Boolean flag for loading state
- **QueryData**: SQL, results, and metadata from API

#### 2. Initial State
- **Welcome Message**: 
  - Role: assistant
  - Content: Welcome message with bold "SprintScope"
  - `isInitial: true` flag
  - No suggestions (uses initial 5 questions)

#### 3. Query Handling (`handleRunQuery`)
- **Process**:
  1. Adds user message to messages array
  2. Sets loading state to true
  3. Builds chat history (excludes initial message)
  4. Calls `/api/chat` endpoint with POST request
  5. Handles response:
     - Adds assistant message
     - Updates query data (or clears if clarification)
  6. Sets loading state to false
  7. Handles errors gracefully

- **Clarification Handling**:
  - If `data.sql === null`, clears query data
  - Resets ModelTrace panel to empty state

#### 4. Reset Functionality (`handleReset`)
- **Actions**:
  - Resets messages to initial welcome message
  - Clears query data
  - Resets all UI state

#### 5. Layout Structure
- **Outer Container**:
  - Full screen height
  - Padding: p-4 md:p-6 lg:p-8
  - Z-index: 10

- **Glass Panel**:
  - Rounded corners (24px)
  - Neon purple border
  - Shadow effects (purple and cyan glows)
  - Flex column layout

- **Main Content**:
  - Flex row layout
  - Left: ChatConsole (62% width)
  - Right: ModelTrace (38% width)
  - Border separator between columns

#### 6. Component Integration
- **Header**: Top of application
- **ChatConsole**: Left column, receives messages and loading state
- **ModelTrace**: Right column, receives query data
- **Composer**: Bottom of application, receives callbacks

#### 7. API Integration
- **Endpoint**: `/api/chat`
- **Method**: POST
- **Request Body**:
  ```json
  {
    "message": "user query string",
    "chatHistory": [...]
  }
  ```
- **Response Handling**:
  - Extracts response, SQL, results, suggestions, assumptions
  - Updates state accordingly
  - Handles errors with user-friendly messages

---

## Component Interactions

### Data Flow

```
User Input (Composer)
    ↓
handleRunQuery (Page)
    ↓
POST /api/chat
    ↓
API Response
    ↓
Update State (Page)
    ↓
┌───────────────┬───────────────┐
│               │               │
ChatConsole   ModelTrace    Composer
(Message)     (QueryData)   (Loading)
```

### Event Flow

1. **User Types Query** → Composer updates local state
2. **User Clicks "Run Query"** → Composer calls `onRunQuery(query)`
3. **Page Handler** → Adds user message, sets loading, calls API
4. **API Response** → Page updates messages and query data
5. **Components Re-render** → ChatConsole shows new message, ModelTrace shows results
6. **User Clicks Suggestion** → ChatConsole calls `onSuggestionClick(suggestion)`
7. **Page Handler** → Treats suggestion as new query, repeats flow

### State Synchronization

- **Messages**: Managed in Page, passed to ChatConsole
- **Query Data**: Managed in Page, passed to ModelTrace
- **Loading State**: Managed in Page, passed to ChatConsole and Composer
- **Input Value**: Managed locally in Composer

---

## Styling & Theming

### Design System

#### Color Palette
- **Neon Purple**: `#8B5CF6` (primary accent)
- **Neon Cyan**: `#22D3EE` (secondary accent)
- **Neon Pink**: `#EC4899` (highlight color)
- **Neon Amber**: `#F59E0B` (warning/info)

#### Glass Morphism
- **Glass Card**: `bg-white/5` with backdrop blur
- **Glass Panel**: Enhanced glass effect with borders
- **Transparency**: Various opacity levels (5%, 10%, 20%, etc.)

#### Typography
- **Font Sizes**: 
  - xs (10px, 12px)
  - sm (14px, 15px)
  - base (16px)
  - xl (20px)
- **Font Weights**: 
  - Normal (400)
  - Medium (500)
  - Semibold (600)
  - Bold (700)
- **Tracking**: Wide tracking for uppercase text

#### Spacing
- **Padding**: Consistent 4px, 6px, 8px multiples
- **Gaps**: 2px, 3px, 4px, 6px for flex gaps
- **Margins**: Similar to padding

#### Borders & Shadows
- **Borders**: `border-white/5` or `border-white/10`
- **Neon Borders**: Custom classes for colored borders
- **Shadows**: Glow effects with rgba colors
- **Rounded Corners**: 8px, 12px, 16px, 24px

#### Animations
- **Framer Motion**: Used for enter/exit animations
- **Transitions**: 200ms, 300ms durations
- **Hover Effects**: Color changes, scale, glow
- **Loading**: Spin, pulse animations

### Responsive Design
- **Breakpoints**: md, lg (Tailwind defaults)
- **Layout**: Flexbox for responsive columns
- **Text**: Responsive sizing with breakpoints

---

## Accessibility Features

### Keyboard Navigation
- **Form Submission**: Enter key submits query
- **Focus States**: Visible focus indicators on inputs
- **Button States**: Clear disabled states

### Visual Feedback
- **Loading States**: Clear visual indicators
- **Error States**: Red color coding for errors
- **Success States**: Green color coding for success
- **Hover States**: Clear hover feedback on interactive elements

### Screen Reader Support
- **Semantic HTML**: Proper use of headings, buttons, forms
- **ARIA Labels**: Can be added for better support
- **Alt Text**: Icons have descriptive purposes

---

## Performance Considerations

### Optimization Techniques
- **React.memo**: Can be added to prevent unnecessary re-renders
- **useCallback**: Used for event handlers where appropriate
- **Lazy Loading**: Components loaded on demand
- **Virtual Scrolling**: Could be added for long message lists

### Rendering
- **Conditional Rendering**: Only renders visible content
- **Key Props**: Proper keys for list items
- **State Updates**: Batched updates where possible

---

## Future Enhancements

### Potential Improvements
1. **Message Search**: Search through conversation history
2. **Export Conversation**: Export chat history as text/PDF
3. **Query History**: Save and replay previous queries
4. **Dark/Light Theme**: Theme toggle
5. **Keyboard Shortcuts**: Shortcuts for common actions
6. **Drag & Drop**: Reorder components
7. **Resizable Panels**: Adjustable column widths
8. **Fullscreen Mode**: Focus on specific components

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-27
