-- =============================================================================
-- Supabase Migration: Competitor Email Tracker
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Profiles table (synced from auth.users via trigger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text,
  role       text NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read profiles"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Trigger: auto-create profile on user signup
-- First user becomes ADMIN, subsequent users become MEMBER
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count int;
  user_role text;
BEGIN
  SELECT count(*) INTO user_count FROM profiles;
  IF user_count = 0 THEN
    user_role := 'ADMIN';
  ELSE
    user_role := 'MEMBER';
  END IF;

  INSERT INTO profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. Competitors
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS competitors (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       text NOT NULL,
  domains    text[] NOT NULL DEFAULT '{}',
  logo_url   text,
  colour_hex text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read competitors"
  ON competitors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert competitors"
  ON competitors FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update competitors"
  ON competitors FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete competitors"
  ON competitors FOR DELETE TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 3. Categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       text UNIQUE NOT NULL,
  is_system  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read categories"
  ON categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON categories FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON categories FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete categories"
  ON categories FOR DELETE TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 4. Emails
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emails (
  id             text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  message_id     text UNIQUE NOT NULL,
  competitor_id  text REFERENCES competitors(id) ON DELETE SET NULL,
  category_id    text REFERENCES categories(id) ON DELETE SET NULL,
  subject        text NOT NULL,
  sender_address text NOT NULL,
  sender_name    text,
  received_at    timestamptz NOT NULL,
  body_text      text,
  body_html      text,
  snippet        text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS emails_competitor_id_idx ON emails(competitor_id);
CREATE INDEX IF NOT EXISTS emails_category_id_idx ON emails(category_id);
CREATE INDEX IF NOT EXISTS emails_received_at_idx ON emails(received_at);
CREATE INDEX IF NOT EXISTS emails_sender_address_idx ON emails(sender_address);

ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read emails"
  ON emails FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert emails"
  ON emails FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update emails"
  ON emails FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete emails"
  ON emails FOR DELETE TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 5. Tags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tags"
  ON tags FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert tags"
  ON tags FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update tags"
  ON tags FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete tags"
  ON tags FOR DELETE TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 6. Email-Tag junction
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_tags (
  email_id text NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  tag_id   text NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (email_id, tag_id)
);

ALTER TABLE email_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read email_tags"
  ON email_tags FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert email_tags"
  ON email_tags FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete email_tags"
  ON email_tags FOR DELETE TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 7. Ingestion Logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingestion_logs (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  message_id    text,
  status        text NOT NULL,
  error_message text,
  processed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ingestion_logs_processed_at_idx ON ingestion_logs(processed_at);
CREATE INDEX IF NOT EXISTS ingestion_logs_status_idx ON ingestion_logs(status);

ALTER TABLE ingestion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ingestion_logs"
  ON ingestion_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert ingestion_logs"
  ON ingestion_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 8. Gmail Sync State
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gmail_sync_state (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email        text UNIQUE NOT NULL,
  history_id   text,
  last_sync_at timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gmail_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read gmail_sync_state"
  ON gmail_sync_state FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert gmail_sync_state"
  ON gmail_sync_state FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update gmail_sync_state"
  ON gmail_sync_state FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete gmail_sync_state"
  ON gmail_sync_state FOR DELETE TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 9. Full-Text Search on emails
-- ---------------------------------------------------------------------------
ALTER TABLE emails ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION emails_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.subject, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.sender_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.sender_address, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.body_text, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS emails_search_vector_trigger ON emails;
CREATE TRIGGER emails_search_vector_trigger
  BEFORE INSERT OR UPDATE ON emails
  FOR EACH ROW
  EXECUTE FUNCTION emails_search_vector_update();

CREATE INDEX IF NOT EXISTS emails_search_vector_idx ON emails USING GIN (search_vector);

-- ---------------------------------------------------------------------------
-- 10. Database functions for analytics + search (called via supabase.rpc)
-- ---------------------------------------------------------------------------

-- Search emails by full-text query
CREATE OR REPLACE FUNCTION search_emails(query text)
RETURNS TABLE(id text, rank real) AS $$
BEGIN
  RETURN QUERY
    SELECT e.id, ts_rank(e.search_vector, plainto_tsquery('english', query)) AS rank
    FROM emails e
    WHERE e.search_vector @@ plainto_tsquery('english', query)
    ORDER BY rank DESC
    LIMIT 1000;
END;
$$ LANGUAGE plpgsql STABLE;

-- Analytics: email volume over time by competitor
CREATE OR REPLACE FUNCTION analytics_volume(
  granularity text DEFAULT 'month',
  date_from timestamptz DEFAULT NULL,
  date_to timestamptz DEFAULT NULL
)
RETURNS TABLE(
  period timestamptz,
  competitor_id text,
  competitor_name text,
  colour_hex text,
  count bigint
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      date_trunc(granularity, e.received_at) AS period,
      e.competitor_id,
      c.name AS competitor_name,
      c.colour_hex,
      COUNT(*)::bigint AS count
    FROM emails e
    LEFT JOIN competitors c ON e.competitor_id = c.id
    WHERE (date_from IS NULL OR e.received_at >= date_from)
      AND (date_to IS NULL OR e.received_at <= date_to)
    GROUP BY date_trunc(granularity, e.received_at), e.competitor_id, c.name, c.colour_hex
    ORDER BY period ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Analytics: category distribution
CREATE OR REPLACE FUNCTION analytics_categories(
  p_competitor_id text DEFAULT NULL,
  date_from timestamptz DEFAULT NULL,
  date_to timestamptz DEFAULT NULL
)
RETURNS TABLE(name text, count bigint) AS $$
BEGIN
  RETURN QUERY
    SELECT
      COALESCE(c.name, 'Uncategorized') AS name,
      COUNT(*)::bigint AS count
    FROM emails e
    LEFT JOIN categories c ON e.category_id = c.id
    WHERE (p_competitor_id IS NULL OR e.competitor_id = p_competitor_id)
      AND (date_from IS NULL OR e.received_at >= date_from)
      AND (date_to IS NULL OR e.received_at <= date_to)
    GROUP BY c.name
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Analytics: competitor email frequency
CREATE OR REPLACE FUNCTION analytics_frequency(
  date_from timestamptz DEFAULT NULL,
  date_to timestamptz DEFAULT NULL
)
RETURNS TABLE(
  id text,
  name text,
  colour_hex text,
  total bigint,
  avg_per_month numeric,
  last_email_date timestamptz
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      comp.id,
      comp.name,
      comp.colour_hex,
      COUNT(e.id)::bigint AS total,
      CASE WHEN COUNT(e.id) = 0 THEN 0
           ELSE ROUND(COUNT(e.id)::numeric / GREATEST(
             EXTRACT(EPOCH FROM (COALESCE(MAX(e.received_at), NOW()) - COALESCE(MIN(e.received_at), NOW()))) / (30.44 * 86400), 1
           ), 1)
      END AS avg_per_month,
      MAX(e.received_at) AS last_email_date
    FROM competitors comp
    LEFT JOIN emails e ON e.competitor_id = comp.id
      AND (date_from IS NULL OR e.received_at >= date_from)
      AND (date_to IS NULL OR e.received_at <= date_to)
    GROUP BY comp.id
    ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql STABLE;
