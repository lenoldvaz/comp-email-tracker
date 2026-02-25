import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireOrgMember } from "@/lib/auth-utils"
import { createCompetitorSchema } from "@/types/schemas"

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get("orgId")

  const supabase = await createClient()
  let query = supabase
    .from("competitors")
    .select("*, emails(count)")
    .order("name")

  if (orgId) query = query.eq("org_id", orgId)

  const { data: competitors, error: dbError } = await query

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Transform count from Supabase's nested format
  const formatted = (competitors || []).map((c) => ({
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
    return NextResponse.json({ error: "Viewers cannot create competitors" }, { status: 403 })
  }

  const parsed = createCompetitorSchema.safeParse(rest)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: competitor, error: dbError } = await supabase
    .from("competitors")
    .insert({
      name: parsed.data.name,
      domains: parsed.data.domains,
      logo_url: parsed.data.logoUrl ?? null,
      colour_hex: parsed.data.colourHex ?? null,
      org_id: orgId,
    })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(competitor, { status: 201 })
}
