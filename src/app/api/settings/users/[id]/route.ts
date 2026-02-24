import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth-utils"
import { z } from "zod/v4"

const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await req.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const supabase = await createClient()

  // Prevent demoting the last admin
  if (parsed.data.role === "MEMBER") {
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "ADMIN")

    if ((count || 0) <= 1 && id === user!.id) {
      return NextResponse.json(
        { error: "Cannot demote the last admin" },
        { status: 400 }
      )
    }
  }

  const { data: profile, error: dbError } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", id)
    .select("id, name, role")
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(profile)
}
