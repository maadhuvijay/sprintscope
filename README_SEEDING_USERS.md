# Users Dataset Seeding Guide

This guide explains how to load the `users.csv` dataset into your Supabase database.

## Prerequisites

1. **Supabase Project**: You need a Supabase project set up (can be on Vercel or Supabase cloud)
2. **Environment Variables**: Set up your `.env.local` file with:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
   > **Important**: Use the **Service Role Key**, not the anon key. Get it from: Supabase Dashboard > Settings > API > Service Role Key

3. **Teams Table**: The users table has a foreign key reference to teams. You should seed teams first:
   ```bash
   npm run seed:teams
   ```

## Step-by-Step Setup

### Step 1: Run SQL Migrations

Before seeding data, you need to create the users table and set up permissions. Run these SQL files in your Supabase SQL Editor (Supabase Dashboard > SQL Editor):

1. **Create users table**:
   - Open: `supabase/migrations/003_create_users_table.sql`
   - Copy and paste the SQL into Supabase SQL Editor
   - Click "Run" to execute

2. **Set up Row Level Security (RLS) policies**:
   - Open: `supabase/migrations/004_setup_users_rls_policies.sql`
   - Copy and paste the SQL into Supabase SQL Editor
   - Click "Run" to execute

### Step 2: (Optional) Enable Foreign Key Constraint

The users table references `teams.team_id`. If you want to enforce referential integrity:

1. First, ensure `team_id` is unique in the teams table:
   ```sql
   ALTER TABLE teams ADD CONSTRAINT teams_team_id_unique UNIQUE (team_id);
   ```

2. Then, uncomment the foreign key constraint in `003_create_users_table.sql`:
   ```sql
   ALTER TABLE users 
   ADD CONSTRAINT fk_users_team_id 
   FOREIGN KEY (team_id) 
   REFERENCES teams(team_id) 
   ON DELETE SET NULL
   ON UPDATE CASCADE;
   ```

> **Note**: The foreign key constraint is optional. If you don't enable it, the table will still work, but there won't be referential integrity checks.

### Step 3: Seed Users Data

Run the seed script:

```bash
npm run seed:users
```

This script will:
- Read `users.csv` from the project root
- Clear existing users data (if any)
- Insert all users from the CSV
- Show progress and any errors

## Data Structure

The users table has the following columns:

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Auto-generated primary key |
| `user_id` | UUID | Unique user identifier from CSV |
| `team_id` | UUID | Foreign key to teams table |
| `full_name` | TEXT | User's full name |
| `email` | TEXT | User's email address |
| `role` | TEXT | User role (dev, qa, pm, designer, data, other) |
| `created_at` | TIMESTAMPTZ | Original creation timestamp from CSV |
| `created_at_metadata` | TIMESTAMPTZ | Metadata: when record was inserted |
| `updated_at_metadata` | TIMESTAMPTZ | Metadata: when record was last updated |

## Permissions (RLS Policies)

The migration sets up Row Level Security (RLS) with:

- **Public Read Access**: Anyone can read users data (required for your application)
- **No Write Access**: Only the service role can modify data (data is read-only from the application)

If you need different permissions, modify `004_setup_users_rls_policies.sql`.

## Verification

After seeding, verify the data:

1. **Check record count**:
   ```sql
   SELECT COUNT(*) FROM users;
   ```
   Should return 501 (500 users + 1 header row, but header is skipped)

2. **Sample data**:
   ```sql
   SELECT * FROM users LIMIT 5;
   ```

3. **Check foreign key relationships** (if enabled):
   ```sql
   SELECT u.user_id, u.full_name, u.email, t.team_name
   FROM users u
   LEFT JOIN teams t ON u.team_id = t.team_id
   LIMIT 10;
   ```

## Troubleshooting

### Error: "users table does not exist"
**Solution**: Make sure you ran `003_create_users_table.sql` migration first.

### Error: "foreign key constraint fails"
**Solutions**:
1. Seed teams first: `npm run seed:teams`
2. Or disable the foreign key constraint (it's commented out by default)

### Error: "duplicate key value violates unique constraint"
**Solution**: The script clears existing data by default. If this fails, manually clear:
```sql
DELETE FROM users;
```

### Error: "Missing required environment variables"
**Solution**: Check your `.env.local` file has:
- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (must be service role key, not anon key)

## Next Steps

After seeding users:
1. Verify data integrity in Supabase dashboard
2. Test queries from your application
3. Verify RLS policies allow read access as expected

## Using in Your Application

Once seeded, you can query users from your application using the Supabase client:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Query users
const { data, error } = await supabase
  .from('users')
  .select('*')
  .limit(50);

// Join with teams
const { data, error } = await supabase
  .from('users')
  .select(`
    user_id,
    full_name,
    email,
    role,
    teams!users_team_id_fkey (
      team_name,
      team_key
    )
  `)
  .limit(50);
```
