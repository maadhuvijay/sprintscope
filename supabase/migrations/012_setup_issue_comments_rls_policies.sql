-- Migration: Setup Row Level Security (RLS) policies for issue_comments table
-- This ensures proper access control for the issue_comments data

-- Enable Row Level Security on issue_comments table
ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow public read access to issue_comments
-- This allows anyone (including your application) to read issue_comments data
-- Adjust this policy based on your security requirements
CREATE POLICY "Allow public read access to issue_comments"
ON issue_comments
FOR SELECT
USING (true);

-- Policy 2: Deny all write operations by default
-- This ensures the data is read-only from the application
-- Only service role key can modify data
CREATE POLICY "Deny all write operations on issue_comments"
ON issue_comments
FOR ALL
USING (false)
WITH CHECK (false);

-- Alternative policies (commented out - uncomment and modify as needed):
-- 
-- Option 1: Allow authenticated users only
-- CREATE POLICY "Allow authenticated read access to issue_comments"
-- ON issue_comments
-- FOR SELECT
-- TO authenticated
-- USING (true);
--
-- Option 2: Allow specific roles
-- CREATE POLICY "Allow service role read access to issue_comments"
-- ON issue_comments
-- FOR SELECT
-- TO service_role
-- USING (true);
--
-- Option 3: Row-based access (restrict by issue)
-- CREATE POLICY "Allow users to read comments for issues in their team"
-- ON issue_comments
-- FOR SELECT
-- USING (
--   issue_id IN (
--     SELECT issue_id FROM issues WHERE team_id IN (
--       SELECT team_id FROM users WHERE user_id = auth.uid()
--     )
--   )
-- );

-- Grant permissions to authenticated users and anon (for public read)
-- Adjust these grants based on your needs
GRANT SELECT ON issue_comments TO anon;
GRANT SELECT ON issue_comments TO authenticated;
GRANT ALL ON issue_comments TO service_role;

-- Grant usage on sequence (for service role inserts)
GRANT USAGE, SELECT ON SEQUENCE issue_comments_id_seq TO service_role;
