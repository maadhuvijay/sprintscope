-- Migration: Create issue_comments table
-- Generated for issue_comments.csv dataset

-- Drop table if exists (for fresh setup)
-- Uncomment the line below if you want to recreate the table
-- DROP TABLE IF EXISTS issue_comments CASCADE;

-- Create issue_comments table
CREATE TABLE IF NOT EXISTS issue_comments (
  id BIGSERIAL PRIMARY KEY,
  comment_id UUID NOT NULL,
  issue_id UUID NOT NULL,
  author_id UUID,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ,
  
  -- Metadata columns
  created_at_metadata TIMESTAMPTZ DEFAULT NOW(),
  updated_at_metadata TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_issue_comments_comment_id ON issue_comments(comment_id);
CREATE INDEX IF NOT EXISTS idx_issue_comments_issue_id ON issue_comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_comments_author_id ON issue_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_issue_comments_created_at ON issue_comments(created_at);

-- Create unique constraint on comment_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_issue_comments_comment_id_unique ON issue_comments(comment_id);

-- Add foreign key constraints (commented out - uncomment after ensuring referenced tables exist)
-- Note: These will fail if the referenced tables/columns don't exist or aren't unique
--
-- Foreign key to issues table
-- ALTER TABLE issue_comments 
-- ADD CONSTRAINT fk_issue_comments_issue_id 
-- FOREIGN KEY (issue_id) 
-- REFERENCES issues(issue_id) 
-- ON DELETE CASCADE
-- ON UPDATE CASCADE;
--
-- Foreign key to users table (author)
-- ALTER TABLE issue_comments 
-- ADD CONSTRAINT fk_issue_comments_author_id 
-- FOREIGN KEY (author_id) 
-- REFERENCES users(user_id) 
-- ON DELETE SET NULL
-- ON UPDATE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE issue_comments IS 'Issue comments dataset loaded from issue_comments.csv';
COMMENT ON COLUMN issue_comments.id IS 'Auto-generated primary key';
COMMENT ON COLUMN issue_comments.comment_id IS 'Unique comment identifier (UUID from CSV)';
COMMENT ON COLUMN issue_comments.issue_id IS 'Foreign key reference to issues.issue_id';
COMMENT ON COLUMN issue_comments.author_id IS 'Foreign key reference to users.user_id (comment author)';
COMMENT ON COLUMN issue_comments.body IS 'Comment body/text content';
COMMENT ON COLUMN issue_comments.created_at IS 'Comment creation timestamp';
