-- Run Logs Schema for Neon PostgreSQL
-- Run this SQL in your Neon dashboard to create the tables

-- Runs table - stores batch run metadata
CREATE TABLE IF NOT EXISTS runs (
  id VARCHAR(50) PRIMARY KEY,
  trigger VARCHAR(20) NOT NULL DEFAULT 'cron',
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  next_cursor VARCHAR(255),
  error_message TEXT,
  summary JSONB DEFAULT '{"processed": 0, "enriched": 0, "skipped": 0, "errors": 0}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Contacts table - stores individual contact processing results
CREATE TABLE IF NOT EXISTS run_contacts (
  id SERIAL PRIMARY KEY,
  run_id VARCHAR(50) NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  contact_id VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  status VARCHAR(20) NOT NULL,
  reason VARCHAR(100),
  fields_updated JSONB DEFAULT '[]'::jsonb,
  validation JSONB,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Stats cache table
CREATE TABLE IF NOT EXISTS stats_cache (
  id INTEGER PRIMARY KEY DEFAULT 1,
  total_count INTEGER NOT NULL DEFAULT 0,
  enriched_count INTEGER NOT NULL DEFAULT 0,
  unenriched_count INTEGER NOT NULL DEFAULT 0,
  percent_complete DECIMAL(5,2) DEFAULT 0,
  list_id VARCHAR(50),
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_runs_start_time ON runs(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_run_contacts_run_id ON run_contacts(run_id);
CREATE INDEX IF NOT EXISTS idx_run_contacts_status ON run_contacts(status);

-- Insert default stats row
INSERT INTO stats_cache (id, total_count, enriched_count, unenriched_count)
VALUES (1, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;
