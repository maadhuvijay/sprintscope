/**
 * Script to run users table migration directly via Supabase
 * This executes the SQL migrations programmatically
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
const envLocalPath = path.join(process.cwd(), '.env.local');

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

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQL(sql: string, description: string) {
  console.log(`\n📝 ${description}...`);
  
  // Supabase JS client doesn't support direct SQL execution
  // We need to use the REST API or RPC function
  // For now, we'll use the REST API with a custom endpoint
  
  try {
    // Try using REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      // If RPC doesn't exist, we'll need to execute via pg directly
      // For Supabase, we can use the REST API with SQL query parameter
      throw new Error('RPC function not available');
    }

    const result = await response.json();
    console.log(`✅ ${description} completed`);
    return result;
  } catch (error: any) {
    // Alternative: Try using Supabase's SQL execution via REST
    console.log(`   ⚠️  Direct SQL execution not available via JS client`);
    console.log(`   Please execute the SQL manually in Supabase Dashboard > SQL Editor`);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Running users table migrations...\n');

    // Read migration files
    const migration1Path = path.join(process.cwd(), 'supabase/migrations/003_create_users_table.sql');
    const migration2Path = path.join(process.cwd(), 'supabase/migrations/004_setup_users_rls_policies.sql');

    const migration1SQL = fs.readFileSync(migration1Path, 'utf-8');
    const migration2SQL = fs.readFileSync(migration2Path, 'utf-8');

    // Clean SQL - remove comments and empty lines for execution
    const cleanSQL1 = migration1SQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments

    const cleanSQL2 = migration2SQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n');

    // Note: Supabase JS client doesn't support arbitrary SQL execution
    // We need to guide the user to run these in the SQL Editor
    console.log('⚠️  Note: Supabase JS client cannot execute arbitrary SQL directly.');
    console.log('   Please run these migrations in Supabase Dashboard > SQL Editor:\n');
    console.log('📄 Migration 1: Create users table');
    console.log('   File: supabase/migrations/003_create_users_table.sql\n');
    console.log('📄 Migration 2: Setup RLS policies');
    console.log('   File: supabase/migrations/004_setup_users_rls_policies.sql\n');
    
    // Try to check if we can use a different approach
    // Check if table already exists
    const { error: checkError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Users table already exists!');
      return;
    }

    console.log('❌ Users table does not exist.');
    console.log('   Please run the SQL migrations first, then run: npm run seed:users');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
