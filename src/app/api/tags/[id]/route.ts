import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth-utils"
import { updateTagSchema } from "@/types/schemas"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await req.json()
  const parsed = updateTagSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: tag, error: dbError } = await supabase
    .from("tags")
    .update({ name: parsed.data.name })
    .eq("id", id)
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(tag)
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
    .from("tags")
    .delete()
    .eq("id", id)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ message: "Deleted" })
}
