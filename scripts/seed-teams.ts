/**
 * Seed script to load teams.csv into Supabase database
 * 
 * Usage:
 *   1. Place teams.csv in the project root directory
 *   2. Set environment variables:
 *      - SUPABASE_URL: Your Supabase project URL
 *      - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key (for admin operations)
 *   3. Run: npm run seed:teams
 * 
 * This script will:
 *   - Create the teams table if it doesn't exist
 *   - Clear existing data (optional, can be disabled)
 *   - Insert data from teams.csv
 *   - Set up Row Level Security (RLS) policies for read access
 */

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.local
const envLocalPath = path.join(process.cwd(), '.env.local');

if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  const lines = envContent.split(/\r?\n/);
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Match KEY=VALUE or KEY="VALUE" or KEY='VALUE'
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*[=:]\s*(.+)$/);
    if (match) {
      const key = match[1];
      let value = match[2].trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      // Set environment variable
      process.env[key] = value;
    }
  }
} else {
  console.warn(`⚠️  .env.local not found at ${envLocalPath}`);
}

// Load environment variables (support both NEXT_PUBLIC_ and direct naming)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('');
  console.error('   Found in .env.local:');
  Object.keys(process.env)
    .filter(k => k.includes('SUPABASE') || k.includes('ANTHROPIC'))
    .forEach(k => console.error(`     ${k}: ${process.env[k] ? '✅ (set)' : '❌ (empty)'}`));
  console.error('');
  console.error('   Required variables:');
  console.error('   - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY (service role key, not anon key)');
  console.error('');
  console.error('   Note: You need the SERVICE ROLE KEY for this script (not the anon key)');
  console.error('   Get it from: Supabase Dashboard > Settings > API > Service Role Key');
  process.exit(1);
}

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Path to teams.csv
const CSV_PATH = path.join(process.cwd(), 'teams.csv');

/**
 * Read and parse CSV file
 */
function readCSV(filePath: string): Record<string, string>[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  const records = parse(fileContent, {
    columns: true, // Use first line as column names
    skip_empty_lines: true,
    trim: true,
    cast: false // Keep as strings, we'll handle types in SQL
  });

  return records;
}

/**
 * Infer column types from CSV data
 */
function inferColumnTypes(records: Record<string, string>[]): Record<string, string> {
  if (records.length === 0) {
    return {};
  }

  const types: Record<string, string> = {};
  const firstRecord = records[0];

  for (const [column, value] of Object.entries(firstRecord)) {
    // Try to infer type
    if (value === null || value === undefined || value === '') {
      types[column] = 'text';
    } else if (!isNaN(Number(value)) && value.trim() !== '') {
      // Check if it's an integer or float
      types[column] = Number.isInteger(Number(value)) ? 'integer' : 'numeric';
    } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
      types[column] = 'boolean';
    } else if (value.match(/^\d{4}-\d{2}-\d{2}/) || value.match(/^\d{4}-\d{2}-\d{2}T/)) {
      types[column] = 'timestamp';
    } else {
      types[column] = 'text';
    }
  }

  return types;
}

/**
 * Create teams table based on CSV structure
 */
async function createTable(records: Record<string, string>[]): Promise<void> {
  if (records.length === 0) {
    throw new Error('CSV file is empty');
  }

  const columns = Object.keys(records[0]);
  const types = inferColumnTypes(records);

  // Generate column definitions
  const columnDefs = columns.map(col => {
    const colName = col.toLowerCase().replace(/[^a-z0-9_]/g, '_'); // Sanitize column name
    const type = types[col] || 'text';
    return `  "${colName}" ${type}`;
  }).join(',\n');

  // Create table SQL
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS teams (
      id BIGSERIAL PRIMARY KEY,
${columnDefs},
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  console.log('📋 Creating teams table...');
  const { error: createError } = await supabase.rpc('exec_sql', { 
    sql: createTableSQL 
  });

  // If RPC doesn't exist, try direct query (requires PostgreSQL extension)
  if (createError) {
    console.log('   Note: Using alternative method to create table...');
    // We'll create the table using a migration SQL file instead
    // This is a fallback - the actual table creation should be done via SQL migration
    console.log('   Please run the SQL migration file first: supabase/migrations/001_create_teams_table.sql');
    throw new Error('Table creation requires SQL migration. Please see supabase/migrations/001_create_teams_table.sql');
  }

  console.log('✅ Table created successfully');
}

/**
 * Insert records into teams table
 */
async function insertRecords(records: Record<string, string>[]): Promise<void> {
  if (records.length === 0) {
    console.log('⚠️  No records to insert');
    return;
  }

  console.log(`📥 Inserting ${records.length} records...`);

  // Transform column names to snake_case and sanitize
  const transformedRecords = records.map(record => {
    const transformed: Record<string, any> = {};
    for (const [key, value] of Object.entries(record)) {
      const sanitizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      
      // Convert empty strings to null
      if (value === '' || value === null || value === undefined) {
        transformed[sanitizedKey] = null;
      } else {
        // Try to convert to appropriate type
        const numValue = Number(value);
        if (!isNaN(numValue) && value.trim() !== '') {
          transformed[sanitizedKey] = Number.isInteger(numValue) ? numValue : numValue;
        } else if (value.toLowerCase() === 'true') {
          transformed[sanitizedKey] = true;
        } else if (value.toLowerCase() === 'false') {
          transformed[sanitizedKey] = false;
        } else {
          transformed[sanitizedKey] = value;
        }
      }
    }
    return transformed;
  });

  // Insert in batches of 1000
  const BATCH_SIZE = 1000;
  let inserted = 0;

  for (let i = 0; i < transformedRecords.length; i += BATCH_SIZE) {
    const batch = transformedRecords.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('teams')
      .insert(batch);

    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
      throw error;
    }

    inserted += batch.length;
    console.log(`   Inserted ${inserted}/${transformedRecords.length} records...`);
  }

  console.log(`✅ Successfully inserted ${inserted} records`);
}

/**
 * Set up Row Level Security policies
 */
async function setupRLS(): Promise<void> {
  console.log('🔒 Setting up Row Level Security policies...');

  // Enable RLS on teams table
  const enableRLSSQL = `ALTER TABLE teams ENABLE ROW LEVEL SECURITY;`;

  // Create policy for public read access (adjust based on your needs)
  const createPolicySQL = `
    CREATE POLICY IF NOT EXISTS "Allow public read access to teams"
    ON teams
    FOR SELECT
    USING (true);
  `;

  // Note: These need to be run via SQL migration or Supabase dashboard
  // Supabase JS client doesn't support arbitrary SQL execution by default
  console.log('   ⚠️  RLS policies must be set up via SQL migration or Supabase dashboard');
  console.log('   Please run: supabase/migrations/002_setup_rls_policies.sql');
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting teams data seeding...\n');

    // Read CSV
    console.log(`📖 Reading ${CSV_PATH}...`);
    const records = readCSV(CSV_PATH);
    console.log(`✅ Found ${records.length} records\n`);

    if (records.length === 0) {
      console.log('⚠️  CSV file is empty. Nothing to seed.');
      return;
    }

    // Display sample record
    console.log('📋 Sample record structure:');
    console.log(JSON.stringify(records[0], null, 2));
    console.log('');

    // Note: Table creation should be done via SQL migration
    // This script assumes the table already exists or will be created via migration
    console.log('⚠️  IMPORTANT: Please run SQL migrations first:');
    console.log('   1. supabase/migrations/001_create_teams_table.sql');
    console.log('   2. supabase/migrations/002_setup_rls_policies.sql');
    console.log('');

    // Check if table exists by trying to query it
    console.log('🔍 Checking if teams table exists...');
    const { error: checkError } = await supabase
      .from('teams')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error('❌ Error: teams table does not exist or is not accessible');
      console.error('   Please run the SQL migration files first');
      console.error('');
      console.error('   Quick setup:');
      console.error('   1. Run: npm run generate:migration (to auto-generate migration from CSV)');
      console.error('   2. Review: supabase/migrations/001_create_teams_table.sql');
      console.error('   3. Execute the SQL in Supabase SQL Editor');
      console.error('   4. Run: npm run seed:teams again');
      console.error('');
      console.error('   Error details:', checkError.message);
      process.exit(1);
    }

    console.log('✅ Table exists and is accessible\n');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing teams data...');
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .neq('id', 0); // Delete all rows

    if (deleteError) {
      console.warn('⚠️  Warning: Could not clear existing data:', deleteError.message);
    } else {
      console.log('✅ Existing data cleared\n');
    }

    // Insert records
    await insertRecords(records);

    // Setup RLS (instructions only, actual setup via SQL)
    await setupRLS();

    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run the SQL migration files in Supabase SQL editor or via CLI');
    console.log('   2. Verify data in Supabase dashboard');
    console.log('   3. Test queries from your application');

  } catch (error) {
    console.error('\n❌ Seeding failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();
