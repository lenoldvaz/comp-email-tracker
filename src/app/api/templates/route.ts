import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get("orgId")

  const supabase = await createClient()
  let query = supabase
    .from("email_drafts")
    .select("id, org_id, title, subject, template_name, html_content, created_by, updated_at, created_at")
    .eq("is_template", true)
    .order("updated_at", { ascending: false })

  if (orgId) query = query.eq("org_id", orgId)

  const { data, error: dbError } = await query
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const templates = (data || []).map((d) => ({
    id: d.id,
    orgId: d.org_id,
    title: d.title,
    subject: d.subject,
    templateName: d.template_name,
    htmlContent: d.html_content,
    createdBy: d.created_by,
    updatedAt: d.updated_at,
    createdAt: d.created_at,
  }))

  return NextResponse.json(templates)
}
