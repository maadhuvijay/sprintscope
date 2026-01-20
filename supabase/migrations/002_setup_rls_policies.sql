-- Migration: Setup Row Level Security (RLS) policies for teams table
-- This ensures proper access control for the teams data

-- Enable Row Level Security on teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow public read access to teams
-- This allows anyone (including your application) to read teams data
-- Adjust this policy based on your security requirements
CREATE POLICY "Allow public read access to teams"
ON teams
FOR SELECT
USING (true);

-- Policy 2: Deny all write operations by default
-- This ensures the data is read-only from the application
-- Only service role key can modify data
CREATE POLICY "Deny all write operations"
ON teams
FOR ALL
USING (false)
WITH CHECK (false);

-- Alternative policies (commented out - uncomment and modify as needed):
-- 
-- Option 1: Allow authenticated users only
-- CREATE POLICY "Allow authenticated read access to teams"
-- ON teams
-- FOR SELECT
-- TO authenticated
-- USING (true);
--
-- Option 2: Allow specific roles
-- CREATE POLICY "Allow service role read access to teams"
-- ON teams
-- FOR SELECT
-- TO service_role
-- USING (true);
--
-- Option 3: Row-based access (if you have user_id column)
-- CREATE POLICY "Allow users to read their own teams"
-- ON teams
-- FOR SELECT
-- USING (auth.uid() = user_id);

-- Grant permissions to authenticated users and anon (for public read)
-- Adjust these grants based on your needs
GRANT SELECT ON teams TO anon;
GRANT SELECT ON teams TO authenticated;
GRANT ALL ON teams TO service_role;

-- Grant usage on sequence (for service role inserts)
GRANT USAGE, SELECT ON SEQUENCE teams_id_seq TO service_role;
