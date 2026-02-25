import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireOrgMember } from "@/lib/auth-utils"
import { createTagSchema } from "@/types/schemas"

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")
  const orgId = searchParams.get("orgId")

  const supabase = await createClient()
  let query = supabase
    .from("tags")
    .select("*, email_tags(count)")
    .order("name")
    .limit(50)

  if (orgId) query = query.eq("org_id", orgId)
  if (q) query = query.ilike("name", `${q.toLowerCase()}%`)

  const { data: tags, error: dbError } = await query

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  const formatted = (tags || []).map((t) => ({
    ...t,
    email_tags: undefined,
    _count: { emails: t.email_tags?.[0]?.count ?? 0 },
  }))

  return NextResponse.json(formatted)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { orgId, ...rest } = body

  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 })
  }

  const { error, orgRole } = await requireOrgMember(orgId)
  if (error) return error

  if (orgRole === "VIEWER") {
    return NextResponse.json({ error: "Viewers cannot create tags" }, { status: 403 })
  }

  const parsed = createTagSchema.safeParse(rest)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })
  }

  const supabase = await createClient()

  // Check if tag exists in this org
  const { data: existing } = await supabase
    .from("tags")
    .select("*")
    .eq("name", parsed.data.name)
    .eq("org_id", orgId)
    .single()

  if (existing) {
    return NextResponse.json(existing)
  }

  const { data: tag, error: dbError } = await supabase
    .from("tags")
    .insert({ name: parsed.data.name, org_id: orgId })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(tag, { status: 201 })
}
