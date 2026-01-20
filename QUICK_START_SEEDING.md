# Quick Start: Loading Teams Data

## Prerequisites Checklist

- [ ] Supabase project created
- [ ] `teams.csv` file in project root
- [ ] Node.js and npm installed

## Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables

Create a `.env.local` file in the project root:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Where to find these:**
- Go to your Supabase project dashboard
- Navigate to **Settings > API**
- Copy **Project URL** → `SUPABASE_URL`
- Copy **Service Role Key** → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### 3. Generate Migration from CSV

This automatically analyzes your CSV and creates the SQL migration:

```bash
npm run generate:migration
```

This will:
- Analyze your `teams.csv` structure
- Generate `supabase/migrations/001_create_teams_table.sql`
- Show you the detected columns and types

### 4. Run Migration in Supabase

1. Go to your Supabase dashboard
2. Click **SQL Editor** in the sidebar
3. Open `supabase/migrations/001_create_teams_table.sql`
4. Review the generated SQL (adjust types if needed)
5. Click **Run** to execute

Then run the RLS policies migration:

1. Open `supabase/migrations/002_setup_rls_policies.sql`
2. Click **Run** to execute

### 5. Seed the Data

```bash
npm run seed:teams
```

This will:
- Read your `teams.csv`
- Insert all records into the database
- Show progress and confirm completion

### 6. Verify

1. Go to Supabase dashboard → **Table Editor**
2. Select the `teams` table
3. Verify your data is there!

## Troubleshooting

**"CSV file not found"**
→ Make sure `teams.csv` is in the project root (same folder as `package.json`)

**"Table does not exist"**
→ Run Step 4 first (execute the SQL migrations)

**"Permission denied"**
→ Check your `SUPABASE_SERVICE_ROLE_KEY` is correct

**Wrong data types?**
→ Edit `supabase/migrations/001_create_teams_table.sql` manually and adjust column types

## Next Steps

After seeding:
1. Your SprintScope app can now query the `teams` table
2. Update `lib/tools.ts` to implement `execute_query` using Supabase
3. Test queries from your application

## Need More Help?

See `README_SEEDING.md` for detailed documentation.
