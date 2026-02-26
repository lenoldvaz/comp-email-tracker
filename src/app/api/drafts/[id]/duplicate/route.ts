import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth()
  if (error) return error

  const { id } = await params
  const supabase = await createClient()

  const { data: original, error: fetchError } = await supabase
    .from("email_drafts")
    .select("*")
    .eq("id", id)
    .single()

  if (fetchError || !original) return NextResponse.json({ error: "Draft not found" }, { status: 404 })

  const { data, error: insertError } = await supabase
    .from("email_drafts")
    .insert({
      org_id: original.org_id,
      title: `${original.title} (Copy)`,
      subject: original.subject,
      html_content: original.html_content,
      text_content: original.text_content,
      is_template: false,
      template_name: null,
      created_by: user!.id,
    })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

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
