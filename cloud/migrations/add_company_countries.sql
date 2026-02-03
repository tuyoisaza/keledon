-- Create company_countries table to link Companies to Countries
CREATE TABLE IF NOT EXISTS company_countries (
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    country_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (company_id, country_code)
);

-- Add country column to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS country TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_company_countries_company_id ON company_countries(company_id);
CREATE INDEX IF NOT EXISTS idx_teams_country ON teams(country);
