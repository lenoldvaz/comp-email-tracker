-- =============================================================================
-- Migration: Multi-Tenant Organizations + Invites
-- Run this in the Supabase SQL Editor AFTER the initial migration.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Organizations table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Org Members table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS org_members (
  org_id    text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      text NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER', 'VIEWER')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2b. SECURITY DEFINER helper functions (bypass RLS to avoid recursion)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_user_org_ids()
RETURNS SETOF text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT org_id FROM org_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION auth_user_admin_org_ids()
RETURNS SETOF text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'ADMIN';
$$;

CREATE OR REPLACE FUNCTION auth_user_write_org_ids()
RETURNS SETOF text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('ADMIN', 'MEMBER');
$$;

CREATE OR REPLACE FUNCTION org_has_members(p_org_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM org_members WHERE org_id = p_org_id);
$$;

-- ---------------------------------------------------------------------------
-- 3. RLS policies for organizations (using helper functions)
-- ---------------------------------------------------------------------------
CREATE POLICY "Org members can read their orgs"
  ON organizations FOR SELECT TO authenticated
  USING (id IN (SELECT auth_user_org_ids()));

CREATE POLICY "Authenticated users can create orgs"
  ON organizations FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Org admins can update their org"
  ON organizations FOR UPDATE TO authenticated
  USING (id IN (SELECT auth_user_admin_org_ids()));

-- ---------------------------------------------------------------------------
-- 4. RLS policies for org_members (using helper functions)
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can read memberships for their orgs"
  ON org_members FOR SELECT TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY "Org admins can insert members"
  ON org_members FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (SELECT auth_user_admin_org_ids())
    OR NOT org_has_members(org_id)
  );

CREATE POLICY "Org admins can update members"
  ON org_members FOR UPDATE TO authenticated
  USING (org_id IN (SELECT auth_user_admin_org_ids()));

CREATE POLICY "Org admins can delete members"
  ON org_members FOR DELETE TO authenticated
  USING (org_id IN (SELECT auth_user_admin_org_ids()));

-- ---------------------------------------------------------------------------
-- 5. Invitations table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invitations (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id      text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER', 'VIEWER')),
  invited_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       text UNIQUE NOT NULL,
  accepted_at timestamptz,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can read invitations"
  ON invitations FOR SELECT TO authenticated
  USING (org_id IN (SELECT auth_user_admin_org_ids()));

CREATE POLICY "Org admins can insert invitations"
  ON invitations FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT auth_user_admin_org_ids()));

CREATE POLICY "Org admins can update invitations"
  ON invitations FOR UPDATE TO authenticated
  USING (org_id IN (SELECT auth_user_admin_org_ids()));

CREATE POLICY "Org admins can delete invitations"
  ON invitations FOR DELETE TO authenticated
  USING (org_id IN (SELECT auth_user_admin_org_ids()));

-- Allow anyone to read invitations by token (for accepting)
CREATE POLICY "Anyone can read invitations by token"
  ON invitations FOR SELECT TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- 6. Add org_id to existing tables
-- ---------------------------------------------------------------------------

ALTER TABLE competitors ADD COLUMN IF NOT EXISTS org_id text REFERENCES organizations(id);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS org_id text REFERENCES organizations(id);
ALTER TABLE tags ADD COLUMN IF NOT EXISTS org_id text REFERENCES organizations(id);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS org_id text REFERENCES organizations(id);
ALTER TABLE ingestion_logs ADD COLUMN IF NOT EXISTS org_id text REFERENCES organizations(id);
ALTER TABLE gmail_sync_state ADD COLUMN IF NOT EXISTS org_id text REFERENCES organizations(id);

-- ---------------------------------------------------------------------------
-- 7. Data migration: create default org and backfill
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  default_org_id text;
BEGIN
  -- Create default org
  INSERT INTO organizations (id, name, slug)
  VALUES (gen_random_uuid()::text, 'My Organization', 'my-organization')
  RETURNING id INTO default_org_id;

  -- Insert all existing profiles into org_members
  INSERT INTO org_members (org_id, user_id, role)
  SELECT default_org_id, p.id, p.role
  FROM profiles p
  ON CONFLICT DO NOTHING;

  -- Backfill org_id on existing tables
  UPDATE competitors SET org_id = default_org_id WHERE org_id IS NULL;
  UPDATE categories SET org_id = default_org_id WHERE org_id IS NULL;
  UPDATE tags SET org_id = default_org_id WHERE org_id IS NULL;
  UPDATE emails SET org_id = default_org_id WHERE org_id IS NULL;
  UPDATE ingestion_logs SET org_id = default_org_id WHERE org_id IS NULL;
  UPDATE gmail_sync_state SET org_id = default_org_id WHERE org_id IS NULL;
END $$;

-- Make org_id NOT NULL after backfill
ALTER TABLE competitors ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE categories ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE tags ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE emails ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE ingestion_logs ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE gmail_sync_state ALTER COLUMN org_id SET NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS competitors_org_id_idx ON competitors(org_id);
CREATE INDEX IF NOT EXISTS categories_org_id_idx ON categories(org_id);
CREATE INDEX IF NOT EXISTS tags_org_id_idx ON tags(org_id);
CREATE INDEX IF NOT EXISTS emails_org_id_idx ON emails(org_id);
CREATE INDEX IF NOT EXISTS ingestion_logs_org_id_idx ON ingestion_logs(org_id);
CREATE INDEX IF NOT EXISTS gmail_sync_state_org_id_idx ON gmail_sync_state(org_id);

-- Scope unique constraints per org
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_name_key;
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS tags_org_name_unique ON tags(org_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS categories_org_name_unique ON categories(org_id, name);

-- ---------------------------------------------------------------------------
-- 8. Update RLS policies on existing tables to be org-scoped
-- ---------------------------------------------------------------------------

-- Competitors
DROP POLICY IF EXISTS "Authenticated users can read competitors" ON competitors;
DROP POLICY IF EXISTS "Authenticated users can insert competitors" ON competitors;
DROP POLICY IF EXISTS "Authenticated users can update competitors" ON competitors;
DROP POLICY IF EXISTS "Authenticated users can delete competitors" ON competitors;

CREATE POLICY "Users can read their org competitors"
  ON competitors FOR SELECT TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY "Non-viewer members can insert competitors"
  ON competitors FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT auth_user_write_org_ids()));

CREATE POLICY "Non-viewer members can update competitors"
  ON competitors FOR UPDATE TO authenticated
  USING (org_id IN (SELECT auth_user_write_org_ids()));

CREATE POLICY "Admins can delete competitors"
  ON competitors FOR DELETE TO authenticated
  USING (org_id IN (SELECT auth_user_admin_org_ids()));

-- Categories
DROP POLICY IF EXISTS "Authenticated users can read categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON categories;

CREATE POLICY "Users can read their org categories"
  ON categories FOR SELECT TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY "Non-viewer members can insert categories"
  ON categories FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT auth_user_write_org_ids()));

CREATE POLICY "Non-viewer members can update categories"
  ON categories FOR UPDATE TO authenticated
  USING (org_id IN (SELECT auth_user_write_org_ids()));

CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE TO authenticated
  USING (org_id IN (SELECT auth_user_admin_org_ids()));

-- Emails
DROP POLICY IF EXISTS "Authenticated users can read emails" ON emails;
DROP POLICY IF EXISTS "Authenticated users can insert emails" ON emails;
DROP POLICY IF EXISTS "Authenticated users can update emails" ON emails;
DROP POLICY IF EXISTS "Authenticated users can delete emails" ON emails;

CREATE POLICY "Users can read their org emails"
  ON emails FOR SELECT TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY "Non-viewer members can insert emails"
  ON emails FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT auth_user_write_org_ids()));

CREATE POLICY "Non-viewer members can update emails"
  ON emails FOR UPDATE TO authenticated
  USING (org_id IN (SELECT auth_user_write_org_ids()));

CREATE POLICY "Admins can delete emails"
  ON emails FOR DELETE TO authenticated
  USING (org_id IN (SELECT auth_user_admin_org_ids()));

-- Tags
DROP POLICY IF EXISTS "Authenticated users can read tags" ON tags;
DROP POLICY IF EXISTS "Authenticated users can insert tags" ON tags;
DROP POLICY IF EXISTS "Authenticated users can update tags" ON tags;
DROP POLICY IF EXISTS "Authenticated users can delete tags" ON tags;

CREATE POLICY "Users can read their org tags"
  ON tags FOR SELECT TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY "Non-viewer members can insert tags"
  ON tags FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT auth_user_write_org_ids()));

CREATE POLICY "Non-viewer members can update tags"
  ON tags FOR UPDATE TO authenticated
  USING (org_id IN (SELECT auth_user_write_org_ids()));

CREATE POLICY "Admins can delete tags"
  ON tags FOR DELETE TO authenticated
  USING (org_id IN (SELECT auth_user_admin_org_ids()));

-- Ingestion Logs
DROP POLICY IF EXISTS "Authenticated users can read ingestion_logs" ON ingestion_logs;
DROP POLICY IF EXISTS "Authenticated users can insert ingestion_logs" ON ingestion_logs;

CREATE POLICY "Users can read their org ingestion_logs"
  ON ingestion_logs FOR SELECT TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY "Non-viewer members can insert ingestion_logs"
  ON ingestion_logs FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT auth_user_write_org_ids()));

-- Gmail Sync State
DROP POLICY IF EXISTS "Authenticated users can read gmail_sync_state" ON gmail_sync_state;
DROP POLICY IF EXISTS "Authenticated users can insert gmail_sync_state" ON gmail_sync_state;
DROP POLICY IF EXISTS "Authenticated users can update gmail_sync_state" ON gmail_sync_state;
DROP POLICY IF EXISTS "Authenticated users can delete gmail_sync_state" ON gmail_sync_state;

CREATE POLICY "Users can read their org gmail_sync_state"
  ON gmail_sync_state FOR SELECT TO authenticated
  USING (org_id IN (SELECT auth_user_org_ids()));

CREATE POLICY "Admins can insert gmail_sync_state"
  ON gmail_sync_state FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT auth_user_admin_org_ids()));

CREATE POLICY "Admins can update gmail_sync_state"
  ON gmail_sync_state FOR UPDATE TO authenticated
  USING (org_id IN (SELECT auth_user_admin_org_ids()));

CREATE POLICY "Admins can delete gmail_sync_state"
  ON gmail_sync_state FOR DELETE TO authenticated
  USING (org_id IN (SELECT auth_user_admin_org_ids()));

-- ---------------------------------------------------------------------------
-- 9. Update handle_new_user trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    'MEMBER'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 10. Update profiles role CHECK to include VIEWER
-- ---------------------------------------------------------------------------
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('ADMIN', 'MEMBER', 'VIEWER'));
