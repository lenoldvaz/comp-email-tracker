import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")
  const competitorId = searchParams.get("competitorId")
  const categoryId = searchParams.get("categoryId")
  const tagId = searchParams.get("tagId")
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const sort = searchParams.get("sort") || "date_desc"
  const page = parseInt(searchParams.get("page") || "1", 10)
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "50", 10), 100)

  const supabase = await createClient()

  // Full-text search: get IDs first via RPC
  let searchIds: string[] | undefined
  if (q) {
    const { data: searchResults } = await supabase.rpc("search_emails", { query: q })
    if (!searchResults || searchResults.length === 0) {
      return NextResponse.json({ emails: [], total: 0, page, pageSize })
    }
    searchIds = searchResults.map((r: { id: string }) => r.id)
  }

  // Build query for count
  let countQuery = supabase
    .from("emails")
    .select("*", { count: "exact", head: true })

  if (searchIds) countQuery = countQuery.in("id", searchIds)
  if (competitorId) countQuery = countQuery.eq("competitor_id", competitorId)
  if (categoryId) countQuery = countQuery.eq("category_id", categoryId)
  if (dateFrom) countQuery = countQuery.gte("received_at", new Date(dateFrom).toISOString())
  if (dateTo) countQuery = countQuery.lte("received_at", new Date(dateTo).toISOString())
  if (tagId) {
    // Get email IDs that have this tag
    const { data: taggedEmails } = await supabase
      .from("email_tags")
      .select("email_id")
      .eq("tag_id", tagId)
    const taggedIds = (taggedEmails || []).map((t) => t.email_id)
    if (taggedIds.length === 0) {
      return NextResponse.json({ emails: [], total: 0, page, pageSize })
    }
    countQuery = countQuery.in("id", taggedIds)
  }

  const { count: total } = await countQuery

  // Build data query
  let dataQuery = supabase
    .from("emails")
    .select(`
      id, subject, sender_address, sender_name, received_at, snippet,
      competitor_id, category_id,
      competitors:competitor_id(id, name, colour_hex),
      categories:category_id(id, name),
      email_tags(tag_id, tags:tag_id(id, name))
    `)

  if (searchIds) dataQuery = dataQuery.in("id", searchIds)
  if (competitorId) dataQuery = dataQuery.eq("competitor_id", competitorId)
  if (categoryId) dataQuery = dataQuery.eq("category_id", categoryId)
  if (dateFrom) dataQuery = dataQuery.gte("received_at", new Date(dateFrom).toISOString())
  if (dateTo) dataQuery = dataQuery.lte("received_at", new Date(dateTo).toISOString())
  if (tagId) {
    const { data: taggedEmails } = await supabase
      .from("email_tags")
      .select("email_id")
      .eq("tag_id", tagId)
    const taggedIds = (taggedEmails || []).map((t) => t.email_id)
    if (taggedIds.length > 0) {
      dataQuery = dataQuery.in("id", taggedIds)
    }
  }

  // Sorting
  switch (sort) {
    case "date_asc":
      dataQuery = dataQuery.order("received_at", { ascending: true })
      break
    case "competitor":
      dataQuery = dataQuery.order("competitor_id", { ascending: true })
      break
    case "category":
      dataQuery = dataQuery.order("category_id", { ascending: true })
      break
    default:
      dataQuery = dataQuery.order("received_at", { ascending: false })
  }

  dataQuery = dataQuery.range((page - 1) * pageSize, page * pageSize - 1)

  const { data: emails, error: dbError } = await dataQuery

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Flatten to match old format
  const formatted = (emails || []).map((e) => ({
    id: e.id,
    subject: e.subject,
    senderAddress: e.sender_address,
    senderName: e.sender_name,
    receivedAt: e.received_at,
    snippet: e.snippet,
    competitorId: e.competitor_id,
    categoryId: e.category_id,
    competitor: e.competitors || null,
    category: e.categories || null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tags: (e.email_tags || []).map((et: any) => et.tags),
  }))

  return NextResponse.json({ emails: formatted, total: total || 0, page, pageSize })
}
