import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import { updateCategorySchema } from "@/types/schemas"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth()
  if (error) return error

  const { id } = await params
  const supabase = await createClient()

  // Check role
  const { data: cat } = await supabase.from("categories").select("org_id").eq("id", id).single()
  if (cat) {
    const { data: membership } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", cat.org_id)
      .eq("user_id", user!.id)
      .single()
    if (membership?.role === "VIEWER") {
      return NextResponse.json({ error: "Viewers cannot edit" }, { status: 403 })
    }
  }

  const body = await req.json()
  const parsed = updateCategorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })
  }

  const { data: category, error: dbError } = await supabase
    .from("categories")
    .update({ name: parsed.data.name })
    .eq("id", id)
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(category)
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
  const { data: cat } = await supabase.from("categories").select("org_id, is_system").eq("id", id).single()

  if (!cat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (cat.is_system) {
    return NextResponse.json({ error: "Cannot delete system categories" }, { status: 400 })
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", cat.org_id)
    .eq("user_id", user!.id)
    .single()
  if (membership?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const { error: dbError } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ message: "Deleted" })
}
