-- Migration: Create users table
-- Generated for users.csv dataset

-- Drop table if exists (for fresh setup)
-- Uncomment the line below if you want to recreate the table
-- DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  created_at TIMESTAMPTZ,
  
  -- Metadata columns
  created_at_metadata TIMESTAMPTZ DEFAULT NOW(),
  updated_at_metadata TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint to teams table
-- Note: This requires that teams.team_id has a UNIQUE constraint
-- If the constraint fails, you may need to:
--   1. Add UNIQUE constraint to teams.team_id first, OR
--   2. Comment out the foreign key constraint below
--
-- To make team_id unique in teams table, run:
--   ALTER TABLE teams ADD CONSTRAINT teams_team_id_unique UNIQUE (team_id);

-- Add foreign key constraint (commented out if teams.team_id is not unique)
-- Uncomment after ensuring teams.team_id is unique:
/*
ALTER TABLE users 
ADD CONSTRAINT fk_users_team_id 
FOREIGN KEY (team_id) 
REFERENCES teams(team_id) 
ON DELETE SET NULL
ON UPDATE CASCADE;
*/

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create unique constraint on user_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_id_unique ON users(user_id);

-- Add comments for documentation
COMMENT ON TABLE users IS 'Users dataset loaded from users.csv';
COMMENT ON COLUMN users.id IS 'Auto-generated primary key';
COMMENT ON COLUMN users.user_id IS 'Unique user identifier (UUID from CSV)';
COMMENT ON COLUMN users.team_id IS 'Foreign key reference to teams.team_id';
COMMENT ON COLUMN users.full_name IS 'Full name of the user';
COMMENT ON COLUMN users.email IS 'User email address';
COMMENT ON COLUMN users.role IS 'User role (dev, qa, pm, designer, data, other)';
COMMENT ON COLUMN users.created_at IS 'Original creation timestamp from CSV';
