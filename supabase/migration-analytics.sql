-- =============================================================================
-- Migration: Enhanced Analytics Functions
-- Run this in the Supabase SQL Editor AFTER migration-orgs.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Top Tags analytics
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION analytics_top_tags(
  date_from timestamptz DEFAULT NULL,
  date_to timestamptz DEFAULT NULL,
  max_tags int DEFAULT 15
)
RETURNS TABLE(tag_name text, count bigint) AS $$
BEGIN
  RETURN QUERY
    SELECT
      t.name AS tag_name,
      COUNT(*)::bigint AS count
    FROM email_tags et
    JOIN tags t ON t.id = et.tag_id
    JOIN emails e ON e.id = et.email_id
    WHERE (date_from IS NULL OR e.received_at >= date_from)
      AND (date_to IS NULL OR e.received_at <= date_to)
    GROUP BY t.name
    ORDER BY count DESC
    LIMIT max_tags;
END;
$$ LANGUAGE plpgsql STABLE;

-- ---------------------------------------------------------------------------
-- 2. Send-time heatmap analytics
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION analytics_send_times(
  date_from timestamptz DEFAULT NULL,
  date_to timestamptz DEFAULT NULL,
  p_competitor_id text DEFAULT NULL
)
RETURNS TABLE(day_of_week int, hour_of_day int, count bigint) AS $$
BEGIN
  RETURN QUERY
    SELECT
      EXTRACT(DOW FROM e.received_at)::int AS day_of_week,
      EXTRACT(HOUR FROM e.received_at)::int AS hour_of_day,
      COUNT(*)::bigint AS count
    FROM emails e
    WHERE (date_from IS NULL OR e.received_at >= date_from)
      AND (date_to IS NULL OR e.received_at <= date_to)
      AND (p_competitor_id IS NULL OR e.competitor_id = p_competitor_id)
    GROUP BY EXTRACT(DOW FROM e.received_at), EXTRACT(HOUR FROM e.received_at)
    ORDER BY day_of_week, hour_of_day;
END;
$$ LANGUAGE plpgsql STABLE;

-- ---------------------------------------------------------------------------
-- 3. Subject line insights analytics
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION analytics_subject_insights(
  date_from timestamptz DEFAULT NULL,
  date_to timestamptz DEFAULT NULL
)
RETURNS TABLE(
  competitor_id text,
  competitor_name text,
  avg_length numeric,
  emoji_count bigint,
  question_count bigint,
  total_emails bigint
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      c.id AS competitor_id,
      c.name AS competitor_name,
      ROUND(AVG(LENGTH(e.subject))::numeric, 1) AS avg_length,
      COUNT(*) FILTER (WHERE e.subject ~ '[^\x00-\x7F]')::bigint AS emoji_count,
      COUNT(*) FILTER (WHERE e.subject LIKE '%?%')::bigint AS question_count,
      COUNT(*)::bigint AS total_emails
    FROM emails e
    JOIN competitors c ON c.id = e.competitor_id
    WHERE (date_from IS NULL OR e.received_at >= date_from)
      AND (date_to IS NULL OR e.received_at <= date_to)
    GROUP BY c.id, c.name
    ORDER BY total_emails DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ---------------------------------------------------------------------------
-- 4. Weekly trends analytics
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION analytics_weekly_trends(
  weeks_back int DEFAULT 12
)
RETURNS TABLE(
  competitor_id text,
  competitor_name text,
  colour_hex text,
  week_start timestamptz,
  count bigint,
  prev_week_count bigint,
  wow_change numeric
) AS $$
BEGIN
  RETURN QUERY
    WITH weekly AS (
      SELECT
        c.id AS comp_id,
        c.name AS comp_name,
        c.colour_hex AS comp_colour,
        date_trunc('week', e.received_at) AS w_start,
        COUNT(*)::bigint AS w_count
      FROM emails e
      JOIN competitors c ON c.id = e.competitor_id
      WHERE e.received_at >= now() - (weeks_back || ' weeks')::interval
      GROUP BY c.id, c.name, c.colour_hex, date_trunc('week', e.received_at)
    )
    SELECT
      w.comp_id AS competitor_id,
      w.comp_name AS competitor_name,
      w.comp_colour AS colour_hex,
      w.w_start AS week_start,
      w.w_count AS count,
      COALESCE(prev.w_count, 0)::bigint AS prev_week_count,
      CASE
        WHEN COALESCE(prev.w_count, 0) = 0 THEN NULL
        ELSE ROUND(((w.w_count - prev.w_count)::numeric / prev.w_count) * 100, 1)
      END AS wow_change
    FROM weekly w
    LEFT JOIN weekly prev ON prev.comp_id = w.comp_id
      AND prev.w_start = w.w_start - interval '1 week'
    ORDER BY w.w_start DESC, w.w_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;
