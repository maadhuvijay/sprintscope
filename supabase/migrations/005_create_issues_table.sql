-- Migration: Create issues table
-- Generated for issues.csv dataset

-- Drop table if exists (for fresh setup)
-- Uncomment the line below if you want to recreate the table
-- DROP TABLE IF EXISTS issues CASCADE;

-- Create issues table
CREATE TABLE IF NOT EXISTS issues (
  id BIGSERIAL PRIMARY KEY,
  issue_id UUID NOT NULL,
  team_id UUID,
  sprint_id UUID,
  issue_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  issue_type TEXT,
  priority TEXT,
  status TEXT,
  story_points INTEGER,
  assignee_id UUID,
  reporter_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  
  -- Metadata columns
  created_at_metadata TIMESTAMPTZ DEFAULT NOW(),
  updated_at_metadata TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_issues_issue_id ON issues(issue_id);
CREATE INDEX IF NOT EXISTS idx_issues_team_id ON issues(team_id);
CREATE INDEX IF NOT EXISTS idx_issues_sprint_id ON issues(sprint_id);
CREATE INDEX IF NOT EXISTS idx_issues_issue_key ON issues(issue_key);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority);
CREATE INDEX IF NOT EXISTS idx_issues_issue_type ON issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_issues_assignee_id ON issues(assignee_id);
CREATE INDEX IF NOT EXISTS idx_issues_reporter_id ON issues(reporter_id);
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues(created_at);
CREATE INDEX IF NOT EXISTS idx_issues_resolved_at ON issues(resolved_at);

-- Create unique constraint on issue_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_issues_issue_id_unique ON issues(issue_id);

-- Create unique constraint on issue_key (if it should be unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_issues_issue_key_unique ON issues(issue_key);

-- Add foreign key constraints (commented out - uncomment after ensuring referenced tables exist)
-- Note: These will fail if the referenced tables/columns don't exist or aren't unique
--
-- Foreign key to teams table
-- ALTER TABLE issues 
-- ADD CONSTRAINT fk_issues_team_id 
-- FOREIGN KEY (team_id) 
-- REFERENCES teams(team_id) 
-- ON DELETE SET NULL
-- ON UPDATE CASCADE;
--
-- Foreign key to users table (assignee)
-- ALTER TABLE issues 
-- ADD CONSTRAINT fk_issues_assignee_id 
-- FOREIGN KEY (assignee_id) 
-- REFERENCES users(user_id) 
-- ON DELETE SET NULL
-- ON UPDATE CASCADE;
--
-- Foreign key to users table (reporter)
-- ALTER TABLE issues 
-- ADD CONSTRAINT fk_issues_reporter_id 
-- FOREIGN KEY (reporter_id) 
-- REFERENCES users(user_id) 
-- ON DELETE SET NULL
-- ON UPDATE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE issues IS 'Issues dataset loaded from issues.csv';
COMMENT ON COLUMN issues.id IS 'Auto-generated primary key';
COMMENT ON COLUMN issues.issue_id IS 'Unique issue identifier (UUID from CSV)';
COMMENT ON COLUMN issues.team_id IS 'Foreign key reference to teams.team_id';
COMMENT ON COLUMN issues.sprint_id IS 'Foreign key reference to sprints.sprint_id (if sprints table exists)';
COMMENT ON COLUMN issues.issue_key IS 'Issue key/identifier (e.g., AI-0001, LEG-0001)';
COMMENT ON COLUMN issues.title IS 'Issue title';
COMMENT ON COLUMN issues.description IS 'Issue description';
COMMENT ON COLUMN issues.issue_type IS 'Type of issue (task, story, bug)';
COMMENT ON COLUMN issues.priority IS 'Issue priority (p0, p1, p2)';
COMMENT ON COLUMN issues.status IS 'Issue status (todo, in_progress, in_review, done, blocked, backlog)';
COMMENT ON COLUMN issues.story_points IS 'Story points estimate';
COMMENT ON COLUMN issues.assignee_id IS 'Foreign key reference to users.user_id (assignee)';
COMMENT ON COLUMN issues.reporter_id IS 'Foreign key reference to users.user_id (reporter)';
COMMENT ON COLUMN issues.created_at IS 'Issue creation timestamp';
COMMENT ON COLUMN issues.updated_at IS 'Issue last update timestamp';
COMMENT ON COLUMN issues.resolved_at IS 'Issue resolution timestamp (if resolved)';
