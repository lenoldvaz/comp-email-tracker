import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import { z } from "zod/v4"

const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
  orgId: z.string().min(1),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth()
  if (error) return error

  const { id } = await params
  const body = await req.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const { orgId, role } = parsed.data
  const supabase = await createClient()

  // Verify caller is admin of this org
  const { data: callerMembership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user!.id)
    .single()

  if (!callerMembership || callerMembership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  // Prevent demoting the last admin
  if (role !== "ADMIN") {
    const { count } = await supabase
      .from("org_members")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("role", "ADMIN")

    if ((count || 0) <= 1 && id === user!.id) {
      return NextResponse.json(
        { error: "Cannot demote the last admin" },
        { status: 400 }
      )
    }
  }

  const { data: member, error: dbError } = await supabase
    .from("org_members")
    .update({ role })
    .eq("org_id", orgId)
    .eq("user_id", id)
    .select("user_id, role")
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(member)
}
