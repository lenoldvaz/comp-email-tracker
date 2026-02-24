import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import { addTagToEmailSchema, removeTagFromEmailSchema } from "@/types/schemas"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  const { id: emailId } = await params
  const body = await req.json()
  const parsed = addTagToEmailSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })
  }

  const supabase = await createClient()

  // Upsert tag (create if not exists)
  let { data: tag } = await supabase
    .from("tags")
    .select("*")
    .eq("name", parsed.data.name)
    .single()

  if (!tag) {
    const { data: newTag, error: tagError } = await supabase
      .from("tags")
      .insert({ name: parsed.data.name })
      .select()
      .single()

    if (tagError) {
      return NextResponse.json({ error: tagError.message }, { status: 500 })
    }
    tag = newTag
  }

  // Create association (ignore if already exists)
  await supabase
    .from("email_tags")
    .upsert({ email_id: emailId, tag_id: tag.id }, { onConflict: "email_id,tag_id" })

  return NextResponse.json(tag, { status: 201 })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  const { id: emailId } = await params
  const body = await req.json()
  const parsed = removeTagFromEmailSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })
  }

  const supabase = await createClient()
  await supabase
    .from("email_tags")
    .delete()
    .eq("email_id", emailId)
    .eq("tag_id", parsed.data.tagId)

  return NextResponse.json({ message: "Tag removed" })
}
