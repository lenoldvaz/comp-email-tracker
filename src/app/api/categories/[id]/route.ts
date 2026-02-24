import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth-utils"
import { updateCategorySchema } from "@/types/schemas"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await req.json()
  const parsed = updateCategorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })
  }

  const supabase = await createClient()
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
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const supabase = await createClient()

  // Check if system category
  const { data: category } = await supabase
    .from("categories")
    .select("is_system")
    .eq("id", id)
    .single()

  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (category.is_system) {
    return NextResponse.json({ error: "Cannot delete system categories" }, { status: 400 })
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
