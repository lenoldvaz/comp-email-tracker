import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireAdmin } from "@/lib/auth-utils"
import { updateEmailSchema } from "@/types/schemas"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const supabase = await createClient()
  const { data: email, error: dbError } = await supabase
    .from("emails")
    .select(`
      *,
      competitors:competitor_id(id, name, colour_hex),
      categories:category_id(id, name),
      email_tags(tag_id, tags:tag_id(id, name))
    `)
    .eq("id", id)
    .single()

  if (dbError || !email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({
    ...email,
    senderAddress: email.sender_address,
    senderName: email.sender_name,
    receivedAt: email.received_at,
    bodyText: email.body_text,
    bodyHtml: email.body_html,
    messageId: email.message_id,
    competitorId: email.competitor_id,
    categoryId: email.category_id,
    createdAt: email.created_at,
    competitor: email.competitors || null,
    category: email.categories || null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tags: (email.email_tags || []).map((et: any) => et.tags),
    // Clean up raw Supabase fields
    competitors: undefined,
    categories: undefined,
    email_tags: undefined,
    sender_address: undefined,
    sender_name: undefined,
    received_at: undefined,
    body_text: undefined,
    body_html: undefined,
    message_id: undefined,
    competitor_id: undefined,
    category_id: undefined,
    created_at: undefined,
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
  const parsed = updateEmailSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })
  }

  const supabase = await createClient()
  const updateData: Record<string, unknown> = {}
  if (parsed.data.categoryId !== undefined) updateData.category_id = parsed.data.categoryId

  const { data: email, error: dbError } = await supabase
    .from("emails")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(email)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const supabase = await createClient()
  const { error: dbError } = await supabase
    .from("emails")
    .delete()
    .eq("id", id)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ message: "Deleted" })
}
