-- Migration: Create sprints table
-- Generated for sprints.csv dataset

-- Drop table if exists (for fresh setup)
-- Uncomment the line below if you want to recreate the table
-- DROP TABLE IF EXISTS sprints CASCADE;

-- Create sprints table
CREATE TABLE IF NOT EXISTS sprints (
  id BIGSERIAL PRIMARY KEY,
  sprint_id UUID NOT NULL,
  team_id UUID,
  sprint_name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  goal TEXT,
  created_at TIMESTAMPTZ,
  
  -- Metadata columns
  created_at_metadata TIMESTAMPTZ DEFAULT NOW(),
  updated_at_metadata TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sprints_sprint_id ON sprints(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprints_team_id ON sprints(team_id);
CREATE INDEX IF NOT EXISTS idx_sprints_sprint_name ON sprints(sprint_name);
CREATE INDEX IF NOT EXISTS idx_sprints_start_date ON sprints(start_date);
CREATE INDEX IF NOT EXISTS idx_sprints_end_date ON sprints(end_date);

-- Create unique constraint on sprint_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_sprints_sprint_id_unique ON sprints(sprint_id);

-- Add foreign key constraints (commented out - uncomment after ensuring referenced tables exist)
-- Note: These will fail if the referenced tables/columns don't exist or aren't unique
--
-- Foreign key to teams table
-- ALTER TABLE sprints 
-- ADD CONSTRAINT fk_sprints_team_id 
-- FOREIGN KEY (team_id) 
-- REFERENCES teams(team_id) 
-- ON DELETE SET NULL
-- ON UPDATE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE sprints IS 'Sprints dataset loaded from sprints.csv';
COMMENT ON COLUMN sprints.id IS 'Auto-generated primary key';
COMMENT ON COLUMN sprints.sprint_id IS 'Unique sprint identifier (UUID from CSV)';
COMMENT ON COLUMN sprints.team_id IS 'Foreign key reference to teams.team_id';
COMMENT ON COLUMN sprints.sprint_name IS 'Sprint name/identifier (e.g., Sprint 01, Sprint 02)';
COMMENT ON COLUMN sprints.start_date IS 'Sprint start date';
COMMENT ON COLUMN sprints.end_date IS 'Sprint end date';
COMMENT ON COLUMN sprints.goal IS 'Sprint goal/objective';
COMMENT ON COLUMN sprints.created_at IS 'Sprint creation timestamp';
