import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import { updateDraftSchema } from "@/lib/validations/draft"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const supabase = await createClient()
  const { data, error: dbError } = await supabase
    .from("email_drafts")
    .select("*")
    .eq("id", id)
    .single()

  if (dbError || !data) return NextResponse.json({ error: "Draft not found" }, { status: 404 })

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
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const body = await req.json()
  const parsed = updateDraftSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.data.title !== undefined) updates.title = parsed.data.title
  if (parsed.data.subject !== undefined) updates.subject = parsed.data.subject
  if (parsed.data.htmlContent !== undefined) updates.html_content = parsed.data.htmlContent
  if (parsed.data.textContent !== undefined) updates.text_content = parsed.data.textContent
  if (parsed.data.isTemplate !== undefined) updates.is_template = parsed.data.isTemplate
  if (parsed.data.templateName !== undefined) updates.template_name = parsed.data.templateName

  const supabase = await createClient()
  const { data, error: dbError } = await supabase
    .from("email_drafts")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (dbError || !data) return NextResponse.json({ error: "Draft not found or update failed" }, { status: 404 })

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
  })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const supabase = await createClient()
  const { error: dbError } = await supabase
    .from("email_drafts")
    .delete()
    .eq("id", id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
