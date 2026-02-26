import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireOrgMember } from "@/lib/auth-utils"
import { createSnippetSchema } from "@/lib/validations/draft"

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get("orgId")

  const supabase = await createClient()
  let query = supabase
    .from("email_snippets")
    .select("*")
    .order("updated_at", { ascending: false })

  if (orgId) query = query.eq("org_id", orgId)

  const { data, error: dbError } = await query
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const snippets = (data || []).map((s) => ({
    id: s.id,
    orgId: s.org_id,
    name: s.name,
    description: s.description,
    htmlContent: s.html_content,
    createdBy: s.created_by,
    updatedAt: s.updated_at,
    createdAt: s.created_at,
  }))

  return NextResponse.json(snippets)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { orgId, ...rest } = body

  if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 })

  const { error, user, orgRole } = await requireOrgMember(orgId)
  if (error) return error
  if (orgRole === "VIEWER") return NextResponse.json({ error: "Viewers cannot create snippets" }, { status: 403 })

  const parsed = createSnippetSchema.safeParse(rest)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()
  const { data, error: dbError } = await supabase
    .from("email_snippets")
    .insert({
      org_id: orgId,
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      html_content: parsed.data.htmlContent,
      created_by: user!.id,
    })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({
    id: data.id,
    orgId: data.org_id,
    name: data.name,
    description: data.description,
    htmlContent: data.html_content,
    createdBy: data.created_by,
    updatedAt: data.updated_at,
    createdAt: data.created_at,
  }, { status: 201 })
}
