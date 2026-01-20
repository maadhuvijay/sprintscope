/**
 * Helper script to generate SQL migration from teams.csv
 * 
 * This script analyzes your CSV file and generates the SQL migration
 * with the correct column definitions.
 * 
 * Usage:
 *   npm run generate:migration
 * 
 * Output: Prints the SQL migration to console and optionally writes to file
 */

import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

const CSV_PATH = path.join(process.cwd(), 'teams.csv');

/**
 * Sanitize column name for SQL
 */
function sanitizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .replace(/_+/g, '_'); // Replace multiple underscores with single
}

/**
 * Infer PostgreSQL type from sample values
 */
function inferPostgresType(column: string, values: string[]): string {
  const nonEmptyValues = values.filter(v => v && v.trim() !== '');
  
  if (nonEmptyValues.length === 0) {
    return 'TEXT'; // Default to text if no values
  }

  // Check if all values are numbers
  const allNumbers = nonEmptyValues.every(v => !isNaN(Number(v)));
  if (allNumbers) {
    // Check if integers
    const allIntegers = nonEmptyValues.every(v => Number.isInteger(Number(v)));
    return allIntegers ? 'INTEGER' : 'NUMERIC';
  }

  // Check for boolean values
  const allBooleans = nonEmptyValues.every(v => 
    v.toLowerCase() === 'true' || 
    v.toLowerCase() === 'false' ||
    v.toLowerCase() === 'yes' ||
    v.toLowerCase() === 'no' ||
    v === '1' ||
    v === '0'
  );
  if (allBooleans) {
    return 'BOOLEAN';
  }

  // Check for date/timestamp patterns
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO datetime
    /^\d{2}\/\d{2}\/\d{4}/, // MM/DD/YYYY
  ];
  const allDates = nonEmptyValues.some(v => 
    datePatterns.some(pattern => pattern.test(v))
  );
  if (allDates) {
    return 'TIMESTAMPTZ';
  }

  // Check for UUID pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const allUUIDs = nonEmptyValues.every(v => uuidPattern.test(v));
  if (allUUIDs) {
    return 'UUID';
  }

  // Default to text
  return 'TEXT';
}

/**
 * Generate SQL migration from CSV
 */
function generateMigration(records: Record<string, string>[]): string {
  if (records.length === 0) {
    throw new Error('CSV file is empty');
  }

  const columns = Object.keys(records[0]);
  
  // Collect all values for each column to infer types
  const columnValues: Record<string, string[]> = {};
  columns.forEach(col => {
    columnValues[col] = records.map(record => record[col] || '');
  });

  // Generate column definitions
  const columnDefs = columns.map(col => {
    const sanitized = sanitizeColumnName(col);
    const type = inferPostgresType(col, columnValues[col]);
    return `  ${sanitized} ${type}`;
  }).join(',\n');

  const sql = `-- Migration: Create teams table
-- Generated automatically from teams.csv
-- Review and adjust column types as needed

-- Drop table if exists (for fresh setup)
-- Uncomment the line below if you want to recreate the table
-- DROP TABLE IF EXISTS teams CASCADE;

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id BIGSERIAL PRIMARY KEY,
${columnDefs},
  
  -- Metadata columns
  created_at_metadata TIMESTAMPTZ DEFAULT NOW(),
  updated_at_metadata TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
-- Add/remove indexes based on your query patterns
${columns.slice(0, 3).map(col => {
  const sanitized = sanitizeColumnName(col);
  return `CREATE INDEX IF NOT EXISTS idx_teams_${sanitized} ON teams(${sanitized});`;
}).join('\n')}

-- Add comments for documentation
COMMENT ON TABLE teams IS 'Teams dataset loaded from teams.csv';
COMMENT ON COLUMN teams.id IS 'Auto-generated primary key';
`;

  return sql;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🔍 Analyzing teams.csv to generate migration...\n');

    // Check if CSV exists
    if (!fs.existsSync(CSV_PATH)) {
      console.error(`❌ Error: CSV file not found at ${CSV_PATH}`);
      console.error('   Please place teams.csv in the project root directory');
      process.exit(1);
    }

    // Read and parse CSV
    console.log('📖 Reading CSV file...');
    const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
    
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: false
    });

    if (records.length === 0) {
      console.error('❌ Error: CSV file is empty');
      process.exit(1);
    }

    console.log(`✅ Found ${records.length} records`);
    console.log(`📋 Detected ${Object.keys(records[0]).length} columns\n`);

    // Display column analysis
    console.log('📊 Column Analysis:');
    const columns = Object.keys(records[0]);
    columns.forEach(col => {
      const sanitized = sanitizeColumnName(col);
      const values = records.map((r: Record<string, string>) => r[col] || '').slice(0, 10);
      const type = inferPostgresType(col, values);
      const sampleValue = values.find((v: string) => v) || '(empty)';
      console.log(`   - ${col} → ${sanitized} (${type})`);
      console.log(`     Sample: "${sampleValue}"`);
    });
    console.log('');

    // Generate migration
    const migrationSQL = generateMigration(records);

    // Output migration
    console.log('📝 Generated SQL Migration:');
    console.log('=' .repeat(70));
    console.log(migrationSQL);
    console.log('=' .repeat(70));
    console.log('');

    // Ask if user wants to write to file
    const outputPath = path.join(process.cwd(), 'supabase', 'migrations', '001_create_teams_table.sql');
    
    // Write to file
    const migrationsDir = path.dirname(outputPath);
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, migrationSQL, 'utf-8');
    console.log(`✅ Migration written to: ${outputPath}`);
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Review the generated migration file');
    console.log('   2. Adjust column types if needed');
    console.log('   3. Run the migration in Supabase SQL editor');
    console.log('   4. Run: npm run seed:teams');

  } catch (error) {
    console.error('\n❌ Error generating migration:');
    console.error(error);
    process.exit(1);
  }
}

main();
