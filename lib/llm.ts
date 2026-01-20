import Anthropic from '@anthropic-ai/sdk';

/**
 * System prompt for SprintScope AI
 * Defines the AI's persona, constraints, and database schema context
 */
export const SPRINT_SCOPE_SYSTEM_PROMPT = `You are SprintScope AI, an expert Agile Data Analyst. Your task is to translate natural language questions into precise SQL queries for a sprint management database.

DATABASE SCHEMA:
- sprints (id, name, start_date, end_date, status)
- issues (id, title, status, priority, story_points, assignee_id, sprint_id, blocked_status, created_at, updated_at)
- teams (id, name)
- users (id, name, team_id, email)
- issue_types (id, name) - e.g., 'Story', 'Bug', 'Task', 'Epic'

GUIDELINES:
1. Always return a valid PostgreSQL query that follows the schema above.
2. If the user asks for a visualization or breakdown, ensure the SQL returns grouped/aggregated data.
3. Be concise and professional. Provide a conversational explanation of the results after executing the query.
4. If a query is impossible based on the schema, explain why and suggest an alternative.
5. Use "blocked_status" boolean field to identify issues that are currently stuck.
6. When filtering by time (e.g., "last sprint", "last two weeks"), use appropriate date functions.
7. Always apply reasonable LIMIT clauses to prevent excessive result sets (default: 100 rows).
8. Use proper JOINs to connect related tables (e.g., issues.sprint_id -> sprints.id).

NEON AESTHETIC TONE:
Maintain a professional yet modern, high-tech tone in your explanations. Use clear, concise language that matches the futuristic AI console aesthetic.`;

/**
 * Initialize Anthropic client
 * Reads API key from ANTHROPIC_API_KEY environment variable
 */
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Claude Sonnet 4.5 model identifier
 * Using the official Claude Sonnet 4.5 model
 */
const MODEL_NAME = 'claude-sonnet-4-5-20250929';

/**
 * Message type for chat history
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Query the LLM with a user message and chat history
 * Returns the assistant's response
 */
export async function querySprintData(
  userMessage: string,
  chatHistory: ChatMessage[] = []
): Promise<string> {
  try {
    // Build messages array for the API
    const messages: Anthropic.MessageParam[] = chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Add the current user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    // Call Claude API
    const response = await anthropic.messages.create({
      model: MODEL_NAME,
      max_tokens: 2048,
      system: SPRINT_SCOPE_SYSTEM_PROMPT,
      messages: messages as Anthropic.MessageParam[],
      temperature: 0.1, // Low temperature for more deterministic SQL generation
    });

    // Extract text content from response
    const textContent = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );

    if (!textContent) {
      throw new Error('No text content in response');
    }

    return textContent.text;
  } catch (error) {
    console.error('Error querying Anthropic API:', error);
    throw error;
  }
}

/**
 * Stream query response (for future use with streaming UI)
 * Note: This is a placeholder for when we implement streaming
 */
export async function* streamSprintData(
  userMessage: string,
  chatHistory: ChatMessage[] = []
): AsyncGenerator<string, void, unknown> {
  try {
    const messages: Anthropic.MessageParam[] = chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    messages.push({
      role: 'user',
      content: userMessage,
    });

    const stream = await anthropic.messages.stream({
      model: MODEL_NAME,
      max_tokens: 2048,
      system: SPRINT_SCOPE_SYSTEM_PROMPT,
      messages: messages as Anthropic.MessageParam[],
      temperature: 0.1,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  } catch (error) {
    console.error('Error streaming from Anthropic API:', error);
    throw error;
  }
}
