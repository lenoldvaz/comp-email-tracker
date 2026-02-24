import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")

  const supabase = await createClient()
  const { data: results, error: dbError } = await supabase.rpc("analytics_frequency", {
    date_from: dateFrom ? new Date(dateFrom).toISOString() : null,
    date_to: dateTo ? new Date(dateTo).toISOString() : null,
  })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(
    (results || []).map((r: { id: string; name: string; colour_hex: string | null; total: number; avg_per_month: number; last_email_date: string | null }) => ({
      id: r.id,
      name: r.name,
      colourHex: r.colour_hex,
      total: Number(r.total),
      avgPerMonth: Number(r.avg_per_month),
      lastEmailDate: r.last_email_date || null,
    }))
  )
}
