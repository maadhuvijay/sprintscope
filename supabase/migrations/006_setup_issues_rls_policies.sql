-- Migration: Setup Row Level Security (RLS) policies for issues table
-- This ensures proper access control for the issues data

-- Enable Row Level Security on issues table
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow public read access to issues
-- This allows anyone (including your application) to read issues data
-- Adjust this policy based on your security requirements
CREATE POLICY "Allow public read access to issues"
ON issues
FOR SELECT
USING (true);

-- Policy 2: Deny all write operations by default
-- This ensures the data is read-only from the application
-- Only service role key can modify data
CREATE POLICY "Deny all write operations on issues"
ON issues
FOR ALL
USING (false)
WITH CHECK (false);

-- Alternative policies (commented out - uncomment and modify as needed):
-- 
-- Option 1: Allow authenticated users only
-- CREATE POLICY "Allow authenticated read access to issues"
-- ON issues
-- FOR SELECT
-- TO authenticated
-- USING (true);
--
-- Option 2: Allow specific roles
-- CREATE POLICY "Allow service role read access to issues"
-- ON issues
-- FOR SELECT
-- TO service_role
-- USING (true);
--
-- Option 3: Row-based access (restrict by team)
-- CREATE POLICY "Allow users to read issues in their team"
-- ON issues
-- FOR SELECT
-- USING (
--   team_id IN (
--     SELECT team_id FROM users WHERE user_id = auth.uid()
--   )
-- );

-- Grant permissions to authenticated users and anon (for public read)
-- Adjust these grants based on your needs
GRANT SELECT ON issues TO anon;
GRANT SELECT ON issues TO authenticated;
GRANT ALL ON issues TO service_role;

-- Grant usage on sequence (for service role inserts)
GRANT USAGE, SELECT ON SEQUENCE issues_id_seq TO service_role;
