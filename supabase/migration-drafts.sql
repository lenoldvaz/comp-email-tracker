-- =============================================================================
-- Migration: Email Drafts, Snippets, and Global Styles
-- Run this in the Supabase SQL Editor AFTER migration-orgs.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Email Drafts table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_drafts (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id        text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title         text NOT NULL DEFAULT 'Untitled Draft',
  subject       text NOT NULL DEFAULT '',
  html_content  text NOT NULL DEFAULT '',
  text_content  text NOT NULL DEFAULT '',
  is_template   boolean NOT NULL DEFAULT false,
  template_name text,
  created_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS email_drafts_org_id_idx ON email_drafts(org_id);
CREATE INDEX IF NOT EXISTS email_drafts_created_by_idx ON email_drafts(created_by);
CREATE INDEX IF NOT EXISTS email_drafts_is_template_idx ON email_drafts(org_id, is_template) WHERE is_template = true;

-- RLS policies
CREATE POLICY "Users can read their org drafts"
  ON email_drafts FOR SELECT TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY "Non-viewer members can insert drafts"
  ON email_drafts FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT auth_user_write_org_ids()));

CREATE POLICY "Non-viewer members can update drafts"
  ON email_drafts FOR UPDATE TO authenticated
  USING (org_id IN (SELECT auth_user_write_org_ids()));

CREATE POLICY "Non-viewer members can delete drafts"
  ON email_drafts FOR DELETE TO authenticated
  USING (org_id IN (SELECT auth_user_write_org_ids()));

-- ---------------------------------------------------------------------------
-- 2. Email Snippets table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_snippets (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id        text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text NOT NULL DEFAULT '',
  html_content  text NOT NULL DEFAULT '',
  created_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_snippets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS email_snippets_org_id_idx ON email_snippets(org_id);

-- RLS policies
CREATE POLICY "Users can read their org snippets"
  ON email_snippets FOR SELECT TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY "Non-viewer members can insert snippets"
  ON email_snippets FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT auth_user_write_org_ids()));

CREATE POLICY "Non-viewer members can update snippets"
  ON email_snippets FOR UPDATE TO authenticated
  USING (org_id IN (SELECT auth_user_write_org_ids()));

CREATE POLICY "Non-viewer members can delete snippets"
  ON email_snippets FOR DELETE TO authenticated
  USING (org_id IN (SELECT auth_user_write_org_ids()));

-- ---------------------------------------------------------------------------
-- 3. Global Styles table (one per org)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS global_styles (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id          text UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  primary_color   text NOT NULL DEFAULT '#3b82f6',
  secondary_color text NOT NULL DEFAULT '#64748b',
  font_family     text NOT NULL DEFAULT 'Arial, Helvetica, sans-serif',
  heading_font    text NOT NULL DEFAULT 'Arial, Helvetica, sans-serif',
  button_style    jsonb NOT NULL DEFAULT '{"borderRadius": "4px", "padding": "12px 24px"}',
  link_color      text NOT NULL DEFAULT '#3b82f6',
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE global_styles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can read their org styles"
  ON global_styles FOR SELECT TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY "Non-viewer members can insert styles"
  ON global_styles FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT auth_user_write_org_ids()));

CREATE POLICY "Non-viewer members can update styles"
  ON global_styles FOR UPDATE TO authenticated
  USING (org_id IN (SELECT auth_user_write_org_ids()));
