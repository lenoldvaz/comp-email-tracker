import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireOrgMember } from "@/lib/auth-utils"
import { createDraftSchema } from "@/lib/validations/draft"

export async function GET(req: Request) {
  const { error, user } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get("orgId")
  const search = searchParams.get("q")

  const supabase = await createClient()
  let query = supabase
    .from("email_drafts")
    .select("id, org_id, title, subject, is_template, template_name, created_by, updated_at, created_at")
    .eq("is_template", false)
    .order("updated_at", { ascending: false })

  if (orgId) query = query.eq("org_id", orgId)
  if (search) query = query.ilike("title", `%${search}%`)

  const { data, error: dbError } = await query
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const drafts = (data || []).map((d) => ({
    id: d.id,
    orgId: d.org_id,
    title: d.title,
    subject: d.subject,
    isTemplate: d.is_template,
    templateName: d.template_name,
    createdBy: d.created_by,
    updatedAt: d.updated_at,
    createdAt: d.created_at,
  }))

  return NextResponse.json(drafts)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { orgId, ...rest } = body

  if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 })

  const { error, user, orgRole } = await requireOrgMember(orgId)
  if (error) return error
  if (orgRole === "VIEWER") return NextResponse.json({ error: "Viewers cannot create drafts" }, { status: 403 })

  const parsed = createDraftSchema.safeParse(rest)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()
  const { data, error: dbError } = await supabase
    .from("email_drafts")
    .insert({
      org_id: orgId,
      title: parsed.data.title ?? "Untitled Draft",
      subject: parsed.data.subject ?? "",
      html_content: parsed.data.htmlContent ?? "",
      text_content: parsed.data.textContent ?? "",
      is_template: parsed.data.isTemplate ?? false,
      template_name: parsed.data.templateName ?? null,
      created_by: user!.id,
    })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({
    id: data.id,
    orgId: data.org_id,
    title: data.title,
    subject: data.subject,
    htmlContent: data.html_content,
    textContent: data.text_content,
    isTemplate: data.is_template,
    templateName: data.template_name,
    createdBy: data.created_by,
    updatedAt: data.updated_at,
    createdAt: data.created_at,
  }, { status: 201 })
}
