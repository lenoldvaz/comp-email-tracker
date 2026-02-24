import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth-utils"

export async function GET(req: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const page = parseInt(searchParams.get("page") || "1", 10)
  const pageSize = 50

  const supabase = await createClient()

  // Count query
  let countQuery = supabase
    .from("ingestion_logs")
    .select("*", { count: "exact", head: true })
  if (status) countQuery = countQuery.eq("status", status)

  const { count: total } = await countQuery

  // Data query
  let dataQuery = supabase
    .from("ingestion_logs")
    .select("*")
    .order("processed_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (status) dataQuery = dataQuery.eq("status", status)

  const { data: logs, error: dbError } = await dataQuery

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ logs: logs || [], total: total || 0, page, pageSize })
}
