import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const maxTags = parseInt(searchParams.get("maxTags") || "15", 10)

  const supabase = await createClient()

  // Try RPC first
  const { data: results, error: dbError } = await supabase.rpc("analytics_top_tags", {
    date_from: dateFrom ? new Date(dateFrom).toISOString() : null,
    date_to: dateTo ? new Date(dateTo).toISOString() : null,
    max_tags: maxTags,
  })

  if (!dbError && results) {
    return NextResponse.json(
      (results || []).map((r: { tag_name: string; count: number }) => ({
        name: r.tag_name,
        count: Number(r.count),
      }))
    )
  }

  // Fallback: direct query
  const { data: tags } = await supabase
    .from("tags")
    .select("name, email_tags(count)")
    .order("name")
    .limit(maxTags)

  if (!tags) return NextResponse.json([])

  const formatted = tags
    .map((t) => ({
      name: t.name,
      count: t.email_tags?.[0]?.count ?? 0,
    }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxTags)

  return NextResponse.json(formatted)
}
