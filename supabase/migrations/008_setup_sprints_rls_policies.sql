-- Migration: Setup Row Level Security (RLS) policies for sprints table
-- This ensures proper access control for the sprints data

-- Enable Row Level Security on sprints table
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow public read access to sprints
-- This allows anyone (including your application) to read sprints data
-- Adjust this policy based on your security requirements
CREATE POLICY "Allow public read access to sprints"
ON sprints
FOR SELECT
USING (true);

-- Policy 2: Deny all write operations by default
-- This ensures the data is read-only from the application
-- Only service role key can modify data
CREATE POLICY "Deny all write operations on sprints"
ON sprints
FOR ALL
USING (false)
WITH CHECK (false);

-- Alternative policies (commented out - uncomment and modify as needed):
-- 
-- Option 1: Allow authenticated users only
-- CREATE POLICY "Allow authenticated read access to sprints"
-- ON sprints
-- FOR SELECT
-- TO authenticated
-- USING (true);
--
-- Option 2: Allow specific roles
-- CREATE POLICY "Allow service role read access to sprints"
-- ON sprints
-- FOR SELECT
-- TO service_role
-- USING (true);
--
-- Option 3: Row-based access (restrict by team)
-- CREATE POLICY "Allow users to read sprints in their team"
-- ON sprints
-- FOR SELECT
-- USING (
--   team_id IN (
--     SELECT team_id FROM users WHERE user_id = auth.uid()
--   )
-- );

-- Grant permissions to authenticated users and anon (for public read)
-- Adjust these grants based on your needs
GRANT SELECT ON sprints TO anon;
GRANT SELECT ON sprints TO authenticated;
GRANT ALL ON sprints TO service_role;

-- Grant usage on sequence (for service role inserts)
GRANT USAGE, SELECT ON SEQUENCE sprints_id_seq TO service_role;
