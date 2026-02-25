import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireOrgMember } from "@/lib/auth-utils"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const { error } = await requireOrgMember(orgId)
  if (error) return error

  const supabase = await createClient()
  const { data: members, error: dbError } = await supabase
    .from("org_members")
    .select("user_id, role, joined_at")
    .eq("org_id", orgId)
    .order("joined_at")

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Get profiles
  const userIds = (members || []).map((m) => m.user_id)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", userIds)

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
