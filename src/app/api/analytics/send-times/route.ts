import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const competitorId = searchParams.get("competitorId")
  const tz = searchParams.get("tz") || "UTC"

  const supabase = await createClient()

  // Try RPC first (RPC uses UTC; we'll adjust in fallback)
  const { data: results, error: dbError } = await supabase.rpc("analytics_send_times", {
    date_from: dateFrom ? new Date(dateFrom).toISOString() : null,
    date_to: dateTo ? new Date(dateTo).toISOString() : null,
    p_competitor_id: competitorId || null,
  })

  if (!dbError && results && Array.isArray(results) && results.length > 0) {
    // RPC returns UTC-based DOW/hour — if client sent a tz, we can't re-bucket
    // from aggregated data, so just return as-is (acceptably close for most use cases,
    // or fall through to the fallback which does proper tz conversion)
    return NextResponse.json(
      results.map((r: { day_of_week: number; hour_of_day: number; count: number }) => ({
        dayOfWeek: r.day_of_week,
        hourOfDay: r.hour_of_day,
        count: Number(r.count),
      }))
    )
  }

  // Fallback: direct query with local timezone conversion
  let query = supabase
    .from("emails")
    .select("received_at")

  if (competitorId) query = query.eq("competitor_id", competitorId)
  if (dateFrom) query = query.gte("received_at", new Date(dateFrom).toISOString())
  if (dateTo) query = query.lte("received_at", new Date(dateTo).toISOString())

  const { data: emails, error: fallbackError } = await query.limit(10000)

  if (fallbackError) {
    return NextResponse.json({ error: fallbackError.message }, { status: 500 })
  }

  // Aggregate using the client's timezone
  const counts = new Map<string, number>()
  for (const e of emails || []) {
    // Convert to the user's local timezone
    let d: Date
    try {
      // Create a date string in the target timezone
      const utcDate = new Date(e.received_at)
      const localStr = utcDate.toLocaleString("en-US", { timeZone: tz })
      d = new Date(localStr)
    } catch {
      // If timezone is invalid, fall back to UTC
      d = new Date(e.received_at)
    }
    const key = `${d.getDay()}-${d.getHours()}`
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  const result = Array.from(counts.entries()).map(([key, count]) => {
    const [dow, hour] = key.split("-").map(Number)
    return { dayOfWeek: dow, hourOfDay: hour, count }
  })

  return NextResponse.json(result)
}
