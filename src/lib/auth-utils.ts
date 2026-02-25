import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null, profile: null }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", user.id)
    .single()

  return { error: null, user, profile }
}

export async function requireAdmin() {
  const { error, user, profile } = await requireAuth()
  if (error) return { error, user: null, profile: null }

  if (profile?.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null, profile: null }
  }

  return { error: null, user: user!, profile: profile! }
}

export async function getActiveOrg(userId: string) {
  const supabase = await createClient()

  const { data: memberships } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(id, name, slug)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })

  if (!memberships || memberships.length === 0) {
    return { org: null, orgRole: null, orgs: [] }
  }

  const orgs = memberships.map((m) => ({
    orgId: m.org_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orgName: (m.organizations as any)?.name || "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orgSlug: (m.organizations as any)?.slug || "",
    role: m.role,
  }))

  // First org is the active one (could be extended with user preference)
  return { org: orgs[0], orgRole: orgs[0].role, orgs }
}

export async function requireOrgMember(orgId: string) {
  const { error, user, profile } = await requireAuth()
  if (error) return { error, user: null, profile: null, orgRole: null }

  const supabase = await createClient()
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user!.id)
    .single()

  if (!membership) {
    return { error: NextResponse.json({ error: "Not a member of this organization" }, { status: 403 }), user: null, profile: null, orgRole: null }
  }

  return { error: null, user: user!, profile: profile!, orgRole: membership.role }
}

export async function requireOrgAdmin(orgId: string) {
  const result = await requireOrgMember(orgId)
  if (result.error) return result

  if (result.orgRole !== "ADMIN") {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }), user: null, profile: null, orgRole: null }
  }

  return result
}
