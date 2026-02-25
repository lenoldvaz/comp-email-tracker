import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireOrgMember } from "@/lib/auth-utils"
import { createCategorySchema } from "@/types/schemas"

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get("orgId")

  const supabase = await createClient()
  let query = supabase
    .from("categories")
    .select("*, emails(count)")
    .order("name")

  if (orgId) query = query.eq("org_id", orgId)

  const { data: categories, error: dbError } = await query

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  const formatted = (categories || []).map((c) => ({
    ...c,
    emails: undefined,
    _count: { emails: c.emails?.[0]?.count ?? 0 },
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
    return NextResponse.json({ error: "Viewers cannot create categories" }, { status: 403 })
  }

  const parsed = createCategorySchema.safeParse(rest)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: category, error: dbError } = await supabase
    .from("categories")
    .insert({ name: parsed.data.name, org_id: orgId })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(category, { status: 201 })
}
