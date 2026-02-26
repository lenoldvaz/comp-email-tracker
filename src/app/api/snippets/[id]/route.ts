import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import { updateSnippetSchema } from "@/lib/validations/draft"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const supabase = await createClient()
  const { data, error: dbError } = await supabase
    .from("email_snippets")
    .select("*")
    .eq("id", id)
    .single()

  if (dbError || !data) return NextResponse.json({ error: "Snippet not found" }, { status: 404 })

  return NextResponse.json({
    id: data.id,
    orgId: data.org_id,
    name: data.name,
    description: data.description,
    htmlContent: data.html_content,
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
  const parsed = updateSnippetSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.description !== undefined) updates.description = parsed.data.description
  if (parsed.data.htmlContent !== undefined) updates.html_content = parsed.data.htmlContent

  const supabase = await createClient()
  const { data, error: dbError } = await supabase
    .from("email_snippets")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (dbError || !data) return NextResponse.json({ error: "Snippet not found" }, { status: 404 })

  return NextResponse.json({
    id: data.id,
    orgId: data.org_id,
    name: data.name,
    description: data.description,
    htmlContent: data.html_content,
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
    .from("email_snippets")
    .delete()
    .eq("id", id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
