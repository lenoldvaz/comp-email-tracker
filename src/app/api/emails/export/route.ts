import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const competitorId = searchParams.get("competitorId")
  const categoryId = searchParams.get("categoryId")
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const q = searchParams.get("q")

  const supabase = await createClient()

  // Full-text search: get IDs first via RPC
  let searchIds: string[] | undefined
  if (q) {
    const { data: searchResults } = await supabase.rpc("search_emails", { query: q })
    if (!searchResults || searchResults.length === 0) {
      return csvResponse("Subject,From,Competitor,Category,Tags,Date\n")
    }
    searchIds = searchResults.map((r: { id: string }) => r.id)
  }

  let query = supabase
    .from("emails")
    .select(`
      subject, sender_address, received_at,
      competitors:competitor_id(name),
      categories:category_id(name),
      email_tags(tags:tag_id(name))
    `)
    .order("received_at", { ascending: false })
    .limit(10000)

  if (searchIds) query = query.in("id", searchIds)
  if (competitorId) query = query.eq("competitor_id", competitorId)
  if (categoryId) query = query.eq("category_id", categoryId)
  if (dateFrom) query = query.gte("received_at", new Date(dateFrom).toISOString())
  if (dateTo) query = query.lte("received_at", new Date(dateTo).toISOString())

  const { data: emails, error: dbError } = await query

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  const rows = (emails || []).map((e) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const competitor = (e.competitors as any)?.name || ""
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const category = (e.categories as any)?.name || ""
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tags = (e.email_tags || []).map((et: any) => et.tags?.name).filter(Boolean).join("; ")
    return [
      csvEscape(e.subject),
      csvEscape(e.sender_address),
      csvEscape(competitor),
      csvEscape(category),
      csvEscape(tags),
      e.received_at,
    ].join(",")
  })

  const csv = "Subject,From,Competitor,Category,Tags,Date\n" + rows.join("\n")
  return csvResponse(csv)
}

function csvEscape(value: string): string {
  if (!value) return ""
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function csvResponse(csv: string): NextResponse {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="emails-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  })
}
