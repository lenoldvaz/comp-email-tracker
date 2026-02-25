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

  // Try RPC first
  const { data: results, error: dbError } = await supabase.rpc("analytics_subject_insights", {
    date_from: dateFrom ? new Date(dateFrom).toISOString() : null,
    date_to: dateTo ? new Date(dateTo).toISOString() : null,
  })

  if (!dbError && results) {
    return NextResponse.json(
      (results || []).map((r: {
        competitor_id: string
        competitor_name: string
        avg_length: number
        emoji_count: number
        question_count: number
        total_emails: number
      }) => ({
        competitorId: r.competitor_id,
        competitorName: r.competitor_name,
        avgLength: Number(r.avg_length),
        emojiCount: Number(r.emoji_count),
        questionCount: Number(r.question_count),
        totalEmails: Number(r.total_emails),
      }))
    )
  }

  // Fallback: direct query
  let query = supabase
    .from("emails")
    .select("subject, competitor_id, competitors:competitor_id(id, name)")

  if (dateFrom) query = query.gte("received_at", new Date(dateFrom).toISOString())
  if (dateTo) query = query.lte("received_at", new Date(dateTo).toISOString())

  const { data: emails } = await query.limit(10000)

  if (!emails || emails.length === 0) return NextResponse.json([])

  // Aggregate per competitor
  const compMap = new Map<string, {
    name: string
    totalLength: number
    emojiCount: number
    questionCount: number
    total: number
  }>()

  for (const e of emails) {
    const compId = e.competitor_id
    if (!compId) continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const compName = (e.competitors as any)?.name || "Unknown"

    if (!compMap.has(compId)) {
      compMap.set(compId, { name: compName, totalLength: 0, emojiCount: 0, questionCount: 0, total: 0 })
    }
    const entry = compMap.get(compId)!
    entry.total++
    entry.totalLength += (e.subject || "").length
    if (/[^\x00-\x7F]/.test(e.subject || "")) entry.emojiCount++
    if ((e.subject || "").includes("?")) entry.questionCount++
  }

  const result = Array.from(compMap.entries()).map(([id, v]) => ({
    competitorId: id,
    competitorName: v.name,
    avgLength: v.total > 0 ? Math.round((v.totalLength / v.total) * 10) / 10 : 0,
    emojiCount: v.emojiCount,
    questionCount: v.questionCount,
    totalEmails: v.total,
  })).sort((a, b) => b.totalEmails - a.totalEmails)

  return NextResponse.json(result)
}
