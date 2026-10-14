CREATE TABLE IF NOT EXISTS team_interfaces (
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    interface_id UUID REFERENCES managed_interfaces(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    PRIMARY KEY (team_id, interface_id)
);

-- RLS Policies
ALTER TABLE team_interfaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON team_interfaces;
DROP POLICY IF EXISTS "Enable all access for superadmins" ON team_interfaces;
