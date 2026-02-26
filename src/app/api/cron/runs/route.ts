import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get("orgId")
  const status = searchParams.get("status")
  const page = parseInt(searchParams.get("page") || "1", 10)
  const pageSize = 20

  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 })
  }

  const supabase = await createClient()

  // Count query
  let countQuery = supabase
    .from("cron_runs")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId)
  if (status) countQuery = countQuery.eq("status", status)

  const { count: total } = await countQuery

  // Data query
  let dataQuery = supabase
    .from("cron_runs")
    .select("*")
    .eq("org_id", orgId)
    .order("started_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (status) dataQuery = dataQuery.eq("status", status)

  const { data: runs, error: dbError } = await dataQuery

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Stats for health cards (last 30 runs)
  const { data: recentRuns } = await supabase
    .from("cron_runs")
    .select("status, duration_ms")
    .eq("org_id", orgId)
    .in("status", ["success", "failed"])
    .order("started_at", { ascending: false })
    .limit(30)

  const successCount = recentRuns?.filter((r) => r.status === "success").length || 0
  const totalCompleted = recentRuns?.length || 0
  const successRate = totalCompleted > 0 ? Math.round((successCount / totalCompleted) * 100) : null
  const durations = recentRuns?.map((r) => r.duration_ms).filter((d): d is number => d !== null) || []
  const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null

  return NextResponse.json({
    runs: runs || [],
    total: total || 0,
    page,
    pageSize,
    stats: { successRate, avgDuration },
  })
}
