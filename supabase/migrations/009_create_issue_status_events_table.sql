-- Migration: Create issue_status_events table
-- Generated for issue_status_events.csv dataset

-- Drop table if exists (for fresh setup)
-- Uncomment the line below if you want to recreate the table
-- DROP TABLE IF EXISTS issue_status_events CASCADE;

-- Create issue_status_events table
CREATE TABLE IF NOT EXISTS issue_status_events (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL,
  issue_id UUID,
  from_status TEXT,
  to_status TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ,
  note TEXT,
  
  -- Metadata columns
  created_at_metadata TIMESTAMPTZ DEFAULT NOW(),
  updated_at_metadata TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_issue_status_events_event_id ON issue_status_events(event_id);
CREATE INDEX IF NOT EXISTS idx_issue_status_events_issue_id ON issue_status_events(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_status_events_changed_by ON issue_status_events(changed_by);
CREATE INDEX IF NOT EXISTS idx_issue_status_events_changed_at ON issue_status_events(changed_at);
CREATE INDEX IF NOT EXISTS idx_issue_status_events_from_status ON issue_status_events(from_status);
CREATE INDEX IF NOT EXISTS idx_issue_status_events_to_status ON issue_status_events(to_status);

-- Create unique constraint on event_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_issue_status_events_event_id_unique ON issue_status_events(event_id);

-- Add foreign key constraints (commented out - uncomment after ensuring referenced tables exist)
-- Note: These will fail if the referenced tables/columns don't exist or aren't unique
--
-- Foreign key to issues table
-- ALTER TABLE issue_status_events 
-- ADD CONSTRAINT fk_issue_status_events_issue_id 
-- FOREIGN KEY (issue_id) 
-- REFERENCES issues(issue_id) 
-- ON DELETE SET NULL
-- ON UPDATE CASCADE;
--
-- Foreign key to users table (changed_by)
-- ALTER TABLE issue_status_events 
-- ADD CONSTRAINT fk_issue_status_events_changed_by 
-- FOREIGN KEY (changed_by) 
-- REFERENCES users(user_id) 
-- ON DELETE SET NULL
-- ON UPDATE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE issue_status_events IS 'Issue status change events dataset loaded from issue_status_events.csv';
COMMENT ON COLUMN issue_status_events.id IS 'Auto-generated primary key';
COMMENT ON COLUMN issue_status_events.event_id IS 'Unique event identifier (UUID from CSV)';
COMMENT ON COLUMN issue_status_events.issue_id IS 'Foreign key reference to issues.issue_id';
COMMENT ON COLUMN issue_status_events.from_status IS 'Previous status of the issue';
COMMENT ON COLUMN issue_status_events.to_status IS 'New status of the issue';
COMMENT ON COLUMN issue_status_events.changed_by IS 'Foreign key reference to users.user_id (who made the change)';
COMMENT ON COLUMN issue_status_events.changed_at IS 'Timestamp when the status change occurred';
COMMENT ON COLUMN issue_status_events.note IS 'Optional note about the status change';
