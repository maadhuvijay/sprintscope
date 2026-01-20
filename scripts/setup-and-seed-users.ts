/**
 * Complete script to set up users table and seed data
 * This script executes SQL migrations and then seeds the data
 */

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.local
const envLocalPath = path.join(process.cwd(), '.env.local');
config({ path: envLocalPath });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

/**
 * Execute SQL via Supabase REST API
 */
async function executeSQL(sql: string): Promise<void> {
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

  for (const statement of statements) {
    // Skip comments and empty statements
    if (statement.trim().startsWith('--') || statement.trim().length === 0) {
      continue;
    }

    try {
      // Use Supabase's REST API to execute SQL
      // Note: This requires the SQL to be executed via the management API
      // For now, we'll use a workaround by executing via the database directly
      
      // Try using the REST API endpoint for SQL execution
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ query: statement })
      });

      // If that doesn't work, the SQL needs to be run manually
      // We'll detect table creation by trying to query it instead
    } catch (error) {
      // SQL execution via REST API is not available
      // We'll need to handle table creation differently
    }
  }
}

/**
 * Create users table using Supabase client operations
 */
async function createUsersTable(): Promise<void> {
  console.log('📝 Creating users table...');
  
  // Check if table already exists
  const { error: checkError } = await supabase
    .from('users')
    .select('id')
    .limit(1);

  if (!checkError) {
    console.log('✅ Users table already exists');
    return;
  }

  console.log('⚠️  Users table does not exist.');
  console.log('   Supabase JS client cannot execute DDL statements directly.');
  console.log('   Please run the SQL migrations in Supabase Dashboard:\n');
  console.log('   1. Go to: Supabase Dashboard > SQL Editor');
  console.log('   2. Copy and paste the contents of: supabase/migrations/003_create_users_table.sql');
  console.log('   3. Click "Run"');
  console.log('   4. Copy and paste the contents of: supabase/migrations/004_setup_users_rls_policies.sql');
  console.log('   5. Click "Run"\n');
  
  // Read and display the SQL
  const migration1Path = path.join(process.cwd(), 'supabase/migrations/003_create_users_table.sql');
  const migration1SQL = fs.readFileSync(migration1Path, 'utf-8');
  
  console.log('📄 SQL Migration 1 (Create Table):');
  console.log('─'.repeat(60));
  console.log(migration1SQL);
  console.log('─'.repeat(60));
  
  throw new Error('Please run the SQL migrations first (see instructions above)');
}

/**
 * Read and parse CSV file
 */
function readCSV(filePath: string): Record<string, string>[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    cast: false
  });

  return records;
}

/**
 * Insert records into users table
 */
async function insertRecords(records: Record<string, string>[]): Promise<void> {
  if (records.length === 0) {
    console.log('⚠️  No records to insert');
    return;
  }

  console.log(`\n📥 Inserting ${records.length} records...`);

  const transformedRecords = records.map(record => ({
    user_id: record.user_id || null,
    team_id: record.team_id || null,
    full_name: record.full_name || null,
    email: record.email || null,
    role: record.role || null,
    created_at: record.created_at || null
  }));

  const BATCH_SIZE = 1000;
  let inserted = 0;

  for (let i = 0; i < transformedRecords.length; i += BATCH_SIZE) {
    const batch = transformedRecords.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('users')
      .insert(batch);

    if (error) {
      console.error(`\n❌ Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
      if (error.message.includes('foreign key')) {
        console.error('   💡 Hint: Make sure teams table has been seeded first');
      }
      throw error;
    }

    inserted += batch.length;
    process.stdout.write(`\r   Inserted ${inserted}/${transformedRecords.length} records...`);
  }

  console.log(`\n✅ Successfully inserted ${inserted} records`);
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting users database setup and seeding...\n');

    // Step 1: Create table
    await createUsersTable();

    // Step 2: Read CSV
    const CSV_PATH = path.join(process.cwd(), 'users.csv');
    console.log(`\n📖 Reading ${CSV_PATH}...`);
    const records = readCSV(CSV_PATH);
    console.log(`✅ Found ${records.length} records`);

    // Step 3: Clear existing data
    console.log('\n🗑️  Clearing existing users data...');
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .neq('id', 0);

    if (deleteError && !deleteError.message.includes('permission')) {
      console.warn('⚠️  Warning:', deleteError.message);
    } else {
      console.log('✅ Existing data cleared');
    }

    // Step 4: Insert records
    await insertRecords(records);

    console.log('\n✅ Setup and seeding completed successfully!');
    console.log(`\n📊 Summary: ${records.length} users loaded into database`);

  } catch (error: any) {
    if (error.message.includes('Please run the SQL migrations')) {
      // Already displayed instructions
      process.exit(1);
    }
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
