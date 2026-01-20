# Teams Data Seeding Guide

This guide explains how to load your `teams.csv` dataset into a Supabase database for use with the SprintScope application.

## Prerequisites

1. **Supabase Project**: You need a Supabase project set up
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project or use an existing one

2. **Environment Variables**: Get your Supabase credentials
   - **SUPABASE_URL**: Found in Project Settings > API > Project URL
   - **SUPABASE_SERVICE_ROLE_KEY**: Found in Project Settings > API > Service Role Key (keep this secret!)

3. **CSV File**: Place `teams.csv` in the project root directory

## Step-by-Step Instructions

### Step 1: Install Dependencies

```bash
npm install
```

This will install the required packages including `@supabase/supabase-js` and `csv-parse`.

### Step 2: Prepare Your CSV File

1. Ensure your `teams.csv` file is in the project root directory
2. The CSV should have a header row with column names
3. The script will automatically:
   - Convert column names to snake_case
   - Infer data types (text, integer, numeric, boolean, timestamp)
   - Handle empty values

### Step 3: Inspect Your CSV Structure

Before running migrations, you may want to see what columns your CSV has:

```bash
# Quick way to see first line (header)
head -n 1 teams.csv

# Or open in a text editor to review structure
```

### Step 4: Update the SQL Migration

Open `supabase/migrations/001_create_teams_table.sql` and update the column definitions to match your CSV:

```sql
CREATE TABLE IF NOT EXISTS teams (
  id BIGSERIAL PRIMARY KEY,
  
  -- Replace these with your actual CSV columns:
  team_name TEXT,
  team_slug TEXT,
  manager TEXT,
  -- ... add all your columns
  
  created_at_metadata TIMESTAMPTZ DEFAULT NOW(),
  updated_at_metadata TIMESTAMPTZ DEFAULT NOW()
);
```

**Tip**: Column names in SQL should match the snake_case version of your CSV headers.

### Step 5: Run SQL Migrations in Supabase

You have two options:

#### Option A: Via Supabase Dashboard (Recommended for first-time setup)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open `supabase/migrations/001_create_teams_table.sql`
4. Copy and paste the contents into the SQL editor
5. Update the column definitions to match your CSV
6. Click **Run** to execute
7. Repeat for `supabase/migrations/002_setup_rls_policies.sql`

#### Option B: Via Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Step 6: Set Environment Variables

Create a `.env.local` file in your project root (if it doesn't exist):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Important**: Never commit `.env.local` to version control. It's already in `.gitignore`.

### Step 7: Run the Seed Script

```bash
npm run seed:teams
```

The script will:
1. Read your `teams.csv` file
2. Transform column names to match the database
3. Clear existing data (optional)
4. Insert all records in batches
5. Provide instructions for RLS setup

### Step 8: Verify Data

1. Go to your Supabase dashboard
2. Navigate to **Table Editor**
3. Select the `teams` table
4. Verify that your data was inserted correctly

## Troubleshooting

### Error: "CSV file not found"
- Make sure `teams.csv` is in the project root directory
- Check the file name is exactly `teams.csv` (case-sensitive on some systems)

### Error: "Table does not exist"
- Make sure you've run the SQL migrations first (Step 5)
- Check that the table name in the migration matches `teams`

### Error: "Column does not exist"
- The CSV column names don't match the SQL table columns
- Update the migration file to include all CSV columns
- Column names are case-insensitive but should match in snake_case

### Error: "Permission denied"
- Check that your `SUPABASE_SERVICE_ROLE_KEY` is correct
- The service role key bypasses RLS, so it should have full access
- Verify the key hasn't been rotated in Supabase dashboard

### Data Type Issues
- If data types are wrong, manually update the migration SQL
- The script infers types, but may not always be correct
- Check for date formats, number formats, etc.

## Customization

### Keep Existing Data

To avoid clearing existing data before inserting, comment out this section in `scripts/seed-teams.ts`:

```typescript
// Clear existing data (optional - comment out if you want to keep existing data)
// console.log('🗑️  Clearing existing teams data...');
// const { error: deleteError } = await supabase
//   .from('teams')
//   .delete()
//   .neq('id', 0);
```

### Change Table Name

To use a different table name:
1. Update the table name in `001_create_teams_table.sql`
2. Update the table name in `002_setup_rls_policies.sql`
3. Update the table name in `scripts/seed-teams.ts` (all references to `teams`)

### Adjust RLS Policies

Edit `002_setup_rls_policies.sql` to customize access:
- Public read: Currently enabled (anyone can read)
- Authenticated only: Uncomment the authenticated policy
- Row-based access: Add user_id column and use auth.uid()

## Next Steps

After seeding:

1. **Update Application Code**: Make sure `lib/tools.ts` can query the `teams` table
2. **Test Queries**: Try querying the data from your application
3. **Set Up Indexes**: Add indexes for columns you'll frequently filter/sort on
4. **Backup**: Consider exporting the data or setting up regular backups

## Support

If you encounter issues:
1. Check the Supabase logs in the dashboard
2. Review the error messages from the seed script
3. Verify your CSV format is valid
4. Ensure all environment variables are set correctly
