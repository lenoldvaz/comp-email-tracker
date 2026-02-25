import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import { updateTagSchema } from "@/types/schemas"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth()
  if (error) return error

  const { id } = await params
  const supabase = await createClient()

  // Check role
  const { data: tag } = await supabase.from("tags").select("org_id").eq("id", id).single()
  if (tag) {
    const { data: membership } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", tag.org_id)
      .eq("user_id", user!.id)
      .single()
    if (membership?.role === "VIEWER") {
      return NextResponse.json({ error: "Viewers cannot edit" }, { status: 403 })
    }
  }

  const body = await req.json()
  const parsed = updateTagSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })
  }

  const { data: updated, error: dbError } = await supabase
    .from("tags")
    .update({ name: parsed.data.name })
    .eq("id", id)
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth()
  if (error) return error

  const { id } = await params
  const supabase = await createClient()

  // Check admin role
  const { data: tag } = await supabase.from("tags").select("org_id").eq("id", id).single()
  if (tag) {
    const { data: membership } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", tag.org_id)
      .eq("user_id", user!.id)
      .single()
    if (membership?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
  }

  const { error: dbError } = await supabase
    .from("tags")
    .delete()
    .eq("id", id)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ message: "Deleted" })
}
