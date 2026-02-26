-- Cron Monitor tables
-- Run after migration-orgs.sql (depends on organizations table and auth helpers)

-- ---------------------------------------------------------------------------
-- 1. Cron Runs table — one row per ingestion invocation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cron_runs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','failed')),
  trigger text NOT NULL DEFAULT 'cron' CHECK (trigger IN ('cron','manual')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  emails_processed int NOT NULL DEFAULT 0,
  emails_duplicates int NOT NULL DEFAULT 0,
  emails_failed int NOT NULL DEFAULT 0,
  error_message text,
  duration_ms int
);

ALTER TABLE cron_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their org cron_runs"
  ON cron_runs FOR SELECT TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY "Service role can insert cron_runs"
  ON cron_runs FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT auth_user_write_org_ids()));

CREATE POLICY "Service role can update cron_runs"
  ON cron_runs FOR UPDATE TO authenticated
  USING (org_id IN (SELECT auth_user_write_org_ids()));

CREATE INDEX idx_cron_runs_org_started ON cron_runs(org_id, started_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Cron Settings table — per-org schedule & notification preferences
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cron_settings (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id text NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  schedule text NOT NULL DEFAULT '0 8 * * *',
  enabled boolean NOT NULL DEFAULT true,
  notify_on_failure boolean NOT NULL DEFAULT false,
  notify_email text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cron_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their org cron_settings"
  ON cron_settings FOR SELECT TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY "Non-viewer members can insert cron_settings"
  ON cron_settings FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT auth_user_write_org_ids()));

CREATE POLICY "Non-viewer members can update cron_settings"
  ON cron_settings FOR UPDATE TO authenticated
  USING (org_id IN (SELECT auth_user_write_org_ids()));
