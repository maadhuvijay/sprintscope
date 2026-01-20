-- Migration: Create teams table
-- Generated automatically from teams.csv
-- Review and adjust column types as needed

-- Drop table if exists (for fresh setup)
-- Uncomment the line below if you want to recreate the table
-- DROP TABLE IF EXISTS teams CASCADE;

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id BIGSERIAL PRIMARY KEY,
  team_id UUID,
  team_key TEXT,
  team_name TEXT,
  created_at TIMESTAMPTZ,
  
  -- Metadata columns
  created_at_metadata TIMESTAMPTZ DEFAULT NOW(),
  updated_at_metadata TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
-- Add/remove indexes based on your query patterns
CREATE INDEX IF NOT EXISTS idx_teams_team_id ON teams(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_team_key ON teams(team_key);
CREATE INDEX IF NOT EXISTS idx_teams_team_name ON teams(team_name);

-- Add comments for documentation
COMMENT ON TABLE teams IS 'Teams dataset loaded from teams.csv';
COMMENT ON COLUMN teams.id IS 'Auto-generated primary key';
