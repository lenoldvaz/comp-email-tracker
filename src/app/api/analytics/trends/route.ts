import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const weeksBack = parseInt(searchParams.get("weeksBack") || "12", 10)

  const supabase = await createClient()

  // Try RPC first
  const { data: results, error: dbError } = await supabase.rpc("analytics_weekly_trends", {
    weeks_back: weeksBack,
  })

  if (!dbError && results) {
    return NextResponse.json(
      (results || []).map((r: {
        competitor_id: string
        competitor_name: string
        colour_hex: string | null
        week_start: string
        count: number
        prev_week_count: number
        wow_change: number | null
      }) => ({
        competitorId: r.competitor_id,
        competitorName: r.competitor_name,
        colourHex: r.colour_hex,
        weekStart: r.week_start,
        count: Number(r.count),
        prevWeekCount: Number(r.prev_week_count),
        wowChange: r.wow_change != null ? Number(r.wow_change) : null,
      }))
    )
  }

  // Fallback: direct query
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - weeksBack * 7)

  const { data: emails } = await supabase
    .from("emails")
    .select("received_at, competitor_id, competitors:competitor_id(id, name, colour_hex)")
    .gte("received_at", cutoff.toISOString())
    .limit(10000)

  if (!emails || emails.length === 0) return NextResponse.json([])

  // Group by competitor + week
  const weekData = new Map<string, Map<string, { name: string; colour: string | null; count: number }>>()

  for (const e of emails) {
    if (!e.competitor_id) continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comp = e.competitors as any
    const compId = e.competitor_id
    const d = new Date(e.received_at)
    // Get Monday of the week
    const day = d.getUTCDay()
    const monday = new Date(d)
    monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7))
    monday.setUTCHours(0, 0, 0, 0)
    const weekKey = monday.toISOString()

    if (!weekData.has(compId)) weekData.set(compId, new Map())
    const compWeeks = weekData.get(compId)!
    if (!compWeeks.has(weekKey)) {
      compWeeks.set(weekKey, { name: comp?.name || "Unknown", colour: comp?.colour_hex || null, count: 0 })
    }
    compWeeks.get(weekKey)!.count++
  }

  // Convert to flat array with WoW change
  const result: Array<{
    competitorId: string
    competitorName: string
    colourHex: string | null
    weekStart: string
    count: number
    prevWeekCount: number
    wowChange: number | null
  }> = []

  for (const [compId, weeks] of weekData) {
    const sortedWeeks = Array.from(weeks.entries()).sort(([a], [b]) => b.localeCompare(a))
    for (let i = 0; i < sortedWeeks.length; i++) {
      const [weekStart, data] = sortedWeeks[i]
      const prevWeek = sortedWeeks[i + 1]
      const prevCount = prevWeek ? prevWeek[1].count : 0
      result.push({
        competitorId: compId,
        competitorName: data.name,
        colourHex: data.colour,
        weekStart,
        count: data.count,
        prevWeekCount: prevCount,
        wowChange: prevCount > 0 ? Math.round(((data.count - prevCount) / prevCount) * 1000) / 10 : null,
      })
    }
  }

  result.sort((a, b) => b.weekStart.localeCompare(a.weekStart) || b.count - a.count)

  return NextResponse.json(result)
}
