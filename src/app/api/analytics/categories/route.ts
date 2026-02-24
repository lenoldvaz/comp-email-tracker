import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const competitorId = searchParams.get("competitorId")
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")

  const supabase = await createClient()
  const { data: results, error: dbError } = await supabase.rpc("analytics_categories", {
    p_competitor_id: competitorId || null,
    date_from: dateFrom ? new Date(dateFrom).toISOString() : null,
    date_to: dateTo ? new Date(dateTo).toISOString() : null,
  })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(
    (results || []).map((r: { name: string; count: number }) => ({
      name: r.name || "Uncategorized",
      count: Number(r.count),
    }))
  )
}
