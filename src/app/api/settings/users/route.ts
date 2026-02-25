import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  const { error, user } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get("orgId")

  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 })
  }

  const supabase = await createClient()

  // Verify user is a member
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user!.id)
    .single()

  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  // Get org members with their profiles
  const { data: members, error: dbError } = await supabase
    .from("org_members")
    .select("user_id, role, joined_at")
    .eq("org_id", orgId)
    .order("joined_at")

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Get profiles for these members
  const userIds = (members || []).map((m) => m.user_id)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", userIds)

  // Get emails from auth.users via admin API
  const serviceClient = createServiceClient()
  const { data: { users } } = await serviceClient.auth.admin.listUsers()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMap = new Map(users.map((u: any) => [u.id, u.email || ""]))
  const profileMap = new Map((profiles || []).map((p) => [p.id, p.name]))

  const result = (members || []).map((m) => ({
    id: m.user_id,
    name: profileMap.get(m.user_id) || null,
    email: userMap.get(m.user_id) || null,
    role: m.role,
    joinedAt: m.joined_at,
  }))

  return NextResponse.json(result)
}
