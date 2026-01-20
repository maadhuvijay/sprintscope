/**
 * Complete script to upload issues.csv to Supabase
 * This script provides SQL migrations and then seeds the data
 */

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.local
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  config({ path: envLocalPath });
}

// Also manually parse .env.local for compatibility
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  const lines = envContent.split(/\r?\n/);
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*[=:]\s*(.+)$/);
    if (match) {
      const key = match[1];
      let value = match[2].trim();
      
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      process.env[key] = value;
    }
  }
}

// Try multiple possible variable names
const SUPABASE_URL = 
  process.env.SUPABASE_URL || 
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

// Try to find service role key - check all possible names
let SUPABASE_SERVICE_ROLE_KEY = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

// If not found, check for any SUPABASE key that might be service role
if (!SUPABASE_SERVICE_ROLE_KEY) {
  const allKeys = Object.keys(process.env)
    .filter(k => k.toUpperCase().includes('SUPABASE') && k.toUpperCase().includes('KEY'));
  
  // Try to find a key that's likely the service role (longer, starts with eyJ)
  for (const key of allKeys) {
    const value = process.env[key];
    if (value && value.length > 200 && value.startsWith('eyJ')) {
      SUPABASE_SERVICE_ROLE_KEY = value;
      console.warn(`⚠️  Using ${key} as service role key (verify this is correct)`);
      break;
    }
  }
  
  // If still not found, use any SUPABASE key as fallback
  if (!SUPABASE_SERVICE_ROLE_KEY && allKeys.length > 0) {
    SUPABASE_SERVICE_ROLE_KEY = process.env[allKeys[0]];
    console.warn(`⚠️  Using ${allKeys[0]} as service role key - this might be anon key!`);
    console.warn('   Get service role key from: Supabase Dashboard > Settings > API > Service Role Key');
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('\n   Please ensure .env.local contains:');
  console.error('   - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY (service role key for admin operations)');
  console.error('\n   Available env variables with SUPABASE:');
  Object.keys(process.env)
    .filter(k => k.toUpperCase().includes('SUPABASE'))
    .forEach(k => {
      const value = process.env[k] || '';
      const preview = value.length > 20 ? value.substring(0, 20) + '...' : value;
      console.error(`     ${k}: ${value ? `✅ (set: ${preview})` : '❌ (empty)'}`);
    });
  console.error('\n   📝 Note: You need the SERVICE ROLE KEY, not the anon/publishable key');
  console.error('   Get it from: Supabase Dashboard > Settings > API > Service Role Key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  try {
    console.log('🚀 Starting issues database upload...\n');

    // Step 1: Check if table exists
    console.log('🔍 Checking if issues table exists...');
    const { error: checkError } = await supabase
      .from('issues')
      .select('id')
      .limit(1);

    if (checkError) {
      console.log('❌ Issues table does not exist.\n');
      console.log('📋 STEP 1: Run SQL Migrations\n');
      console.log('   Please execute these SQL files in Supabase Dashboard > SQL Editor:\n');
      
      // Read and display migration SQL
      const migration1Path = path.join(process.cwd(), 'supabase/migrations/005_create_issues_table.sql');
      const migration2Path = path.join(process.cwd(), 'supabase/migrations/006_setup_issues_rls_policies.sql');
      
      if (fs.existsSync(migration1Path)) {
        const migration1SQL = fs.readFileSync(migration1Path, 'utf-8');
        console.log('   1️⃣  Migration 1: Create issues table');
        console.log('   ─'.repeat(60));
        console.log('   ' + migration1SQL.split('\n').join('\n   '));
        console.log('   ─'.repeat(60));
      }
      
      console.log('\n   After running migration 1, run:');
      
      if (fs.existsSync(migration2Path)) {
        const migration2SQL = fs.readFileSync(migration2Path, 'utf-8');
        console.log('\n   2️⃣  Migration 2: Setup RLS policies');
        console.log('   ─'.repeat(60));
        console.log('   ' + migration2SQL.split('\n').join('\n   '));
        console.log('   ─'.repeat(60));
      }
      
      console.log('\n   Then run this script again: npm run upload:issues\n');
      process.exit(1);
    }

    console.log('✅ Issues table exists\n');

    // Step 2: Read CSV
    const CSV_PATH = path.join(process.cwd(), 'issues.csv');
    console.log(`📖 Reading ${CSV_PATH}...`);
    const records = parse(fs.readFileSync(CSV_PATH, 'utf-8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    console.log(`✅ Found ${records.length} records\n`);

    // Step 3: Clear existing data
    console.log('🗑️  Clearing existing issues data...');
    const { error: deleteError } = await supabase
      .from('issues')
      .delete()
      .neq('id', 0);

    if (deleteError && !deleteError.message.includes('permission')) {
      console.warn('⚠️  Warning:', deleteError.message);
    } else {
      console.log('✅ Existing data cleared\n');
    }

    // Step 4: Insert records
    console.log(`📥 Inserting ${records.length} records...`);
    
    const transformedRecords = records.map(record => ({
      issue_id: record.issue_id || null,
      team_id: record.team_id || null,
      sprint_id: record.sprint_id || null,
      issue_key: record.issue_key || null,
      title: record.title || null,
      description: record.description || null,
      issue_type: record.issue_type || null,
      priority: record.priority || null,
      status: record.status || null,
      story_points: record.story_points ? parseInt(record.story_points, 10) : null,
      assignee_id: record.assignee_id || null,
      reporter_id: record.reporter_id || null,
      created_at: record.created_at || null,
      updated_at: record.updated_at || null,
      resolved_at: record.resolved_at || null
    }));

    const BATCH_SIZE = 1000;
    let inserted = 0;

    for (let i = 0; i < transformedRecords.length; i += BATCH_SIZE) {
      const batch = transformedRecords.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('issues')
        .insert(batch);

      if (error) {
        console.error(`\n❌ Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
        if (error.message.includes('foreign key')) {
          console.error('   💡 Hint: Make sure teams and users tables have been seeded first');
        }
        throw error;
      }

      inserted += batch.length;
      process.stdout.write(`\r   Progress: ${inserted}/${transformedRecords.length} records...`);
    }

    console.log(`\n✅ Successfully inserted ${inserted} records`);
    console.log(`\n📊 Upload complete! ${records.length} issues are now in your database.`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack:', error.stack);
    }
    process.exit(1);
  }
}

main();
