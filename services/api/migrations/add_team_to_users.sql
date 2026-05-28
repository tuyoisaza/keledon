-- Add team_id to users table
ALTER TABLE users 
ADD COLUMN team_id UUID REFERENCES teams(id);

-- Optional: Create an index for performance
CREATE INDEX idx_users_team_id ON users(team_id);
