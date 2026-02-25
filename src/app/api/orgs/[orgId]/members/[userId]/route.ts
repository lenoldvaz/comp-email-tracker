import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireOrgAdmin } from "@/lib/auth-utils"
import { z } from "zod/v4"

const updateMemberSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  const { orgId, userId } = await params
  const { error, user } = await requireOrgAdmin(orgId)
  if (error) return error

  const body = await req.json()
  const parsed = updateMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const supabase = await createClient()

  // Prevent demoting the last admin
  if (parsed.data.role !== "ADMIN") {
    const { count } = await supabase
      .from("org_members")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("role", "ADMIN")

    if ((count || 0) <= 1 && userId === user!.id) {
      return NextResponse.json(
        { error: "Cannot demote the last admin" },
        { status: 400 }
      )
    }
  }

  const { data: member, error: dbError } = await supabase
    .from("org_members")
    .update({ role: parsed.data.role })
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .select("user_id, role")
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(member)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  const { orgId, userId } = await params
  const { error, user } = await requireOrgAdmin(orgId)
  if (error) return error

  const supabase = await createClient()

  // Cannot remove yourself if you're the last admin
  if (userId === user!.id) {
    const { count } = await supabase
      .from("org_members")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("role", "ADMIN")

    if ((count || 0) <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last admin" },
        { status: 400 }
      )
    }
  }
  const { error: dbError } = await supabase
    .from("org_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ message: "Member removed" })
}
