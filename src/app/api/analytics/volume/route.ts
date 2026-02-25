import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const granularity = searchParams.get("granularity") || "month"
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const competitorId = searchParams.get("competitorId")

  const interval = granularity === "week" ? "week" : "month"

  const supabase = await createClient()
  const { data: results, error: dbError } = await supabase.rpc("analytics_volume", {
    granularity: interval,
    date_from: dateFrom ? new Date(dateFrom).toISOString() : null,
    date_to: dateTo ? new Date(dateTo).toISOString() : null,
  })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  const formatted = (results || []).map((r: { period: string; competitor_id: string | null; competitor_name: string | null; colour_hex: string | null; count: number }) => ({
    period: r.period,
    competitorId: r.competitor_id,
    competitorName: r.competitor_name || "Unknown",
    colourHex: r.colour_hex,
    count: Number(r.count),
  }))

  const filtered = competitorId
    ? formatted.filter((r: { competitorId: string | null }) => r.competitorId === competitorId)
    : formatted

  return NextResponse.json(filtered)
}
