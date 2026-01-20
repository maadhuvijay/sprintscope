/**
 * Seed script to load users.csv into Supabase database
 * 
 * Usage:
 *   1. Place users.csv in the project root directory
 *   2. Set environment variables:
 *      - SUPABASE_URL: Your Supabase project URL
 *      - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key (for admin operations)
 *   3. Run: npm run seed:users
 * 
 * This script will:
 *   - Create the users table if it doesn't exist (via migration)
 *   - Clear existing data (optional, can be disabled)
 *   - Insert data from users.csv
 *   - Set up Row Level Security (RLS) policies for read access (via migration)
 */

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

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

// Path to users.csv
const CSV_PATH = path.join(process.cwd(), 'users.csv');

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
 * Insert records into users table
 */
async function insertRecords(records: Record<string, string>[]): Promise<void> {
  if (records.length === 0) {
    console.log('⚠️  No records to insert');
    return;
  }

  console.log(`📥 Inserting ${records.length} records...`);

  // Transform records to match database schema
  const transformedRecords = records.map(record => {
    const transformed: Record<string, any> = {};
    
    // Map CSV columns to database columns
    transformed.user_id = record.user_id || null;
    transformed.team_id = record.team_id || null;
    transformed.full_name = record.full_name || null;
    transformed.email = record.email || null;
    transformed.role = record.role || null;
    
    // Parse created_at timestamp
    if (record.created_at) {
      transformed.created_at = record.created_at;
    } else {
      transformed.created_at = null;
    }
    
    // Convert empty strings to null
    for (const key in transformed) {
      if (transformed[key] === '') {
        transformed[key] = null;
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
      .from('users')
      .insert(batch);

    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
      
      // Provide helpful error messages
      if (error.message.includes('foreign key')) {
        console.error('   💡 Hint: Make sure teams table has been seeded first');
        console.error('   Run: npm run seed:teams');
      } else if (error.message.includes('duplicate key')) {
        console.error('   💡 Hint: Some users may already exist. Clear existing data first.');
      }
      
      throw error;
    }

    inserted += batch.length;
    console.log(`   Inserted ${inserted}/${transformedRecords.length} records...`);
  }

  console.log(`✅ Successfully inserted ${inserted} records`);
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting users data seeding...\n');

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

    // Check if table exists by trying to query it
    console.log('🔍 Checking if users table exists...');
    const { error: checkError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error('❌ Error: users table does not exist or is not accessible');
      console.error('   Please run the SQL migration files first');
      console.error('');
      console.error('   Quick setup:');
      console.error('   1. Open Supabase Dashboard > SQL Editor');
      console.error('   2. Run: supabase/migrations/003_create_users_table.sql');
      console.error('   3. Run: supabase/migrations/004_setup_users_rls_policies.sql');
      console.error('   4. Run: npm run seed:users again');
      console.error('');
      console.error('   Error details:', checkError.message);
      process.exit(1);
    }

    console.log('✅ Table exists and is accessible\n');

    // Check if teams table exists (users table has foreign key to teams)
    console.log('🔍 Checking if teams table exists (for foreign key constraint)...');
    const { error: teamsCheckError } = await supabase
      .from('teams')
      .select('team_id')
      .limit(1);

    if (teamsCheckError) {
      console.warn('⚠️  Warning: teams table does not exist');
      console.warn('   Users table has a foreign key to teams.team_id');
      console.warn('   You may need to seed teams first: npm run seed:teams');
      console.warn('   Or the foreign key constraint may fail for some records\n');
    } else {
      console.log('✅ Teams table exists\n');
    }

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing users data...');
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .neq('id', 0); // Delete all rows

    if (deleteError) {
      console.warn('⚠️  Warning: Could not clear existing data:', deleteError.message);
    } else {
      console.log('✅ Existing data cleared\n');
    }

    // Insert records
    await insertRecords(records);

    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Verify data in Supabase dashboard');
    console.log('   2. Test queries from your application');
    console.log('   3. Verify RLS policies are working correctly');

  } catch (error: any) {
    console.error('\n❌ Seeding failed:');
    console.error(error.message || error);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();
