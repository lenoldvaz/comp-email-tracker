import { createClient } from "@/lib/supabase/server"
import { getActiveOrg } from "@/lib/auth-utils"
import { DashboardShell } from "./dashboard-shell"
import { Providers } from "./providers"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const user = session?.user
  const userId = user?.id ?? ""
  let userName = user?.email ?? ""
  let userRole = "MEMBER"

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, role")
      .eq("id", user.id)
      .single()

    if (profile) {
      userName = profile.name || userName
      userRole = profile.role || userRole
    }
  }

  // Fetch org memberships
  const { org, orgs } = userId ? await getActiveOrg(userId) : { org: null, orgs: [] }

  return (
    <Providers
      userId={userId}
      userName={userName}
      userRole={userRole}
      orgId={org?.orgId ?? ""}
      orgName={org?.orgName ?? ""}
      orgRole={org?.role ?? ""}
      orgs={orgs}
    >
      <DashboardShell userName={userName} userRole={userRole} orgRole={org?.role ?? ""}>
        {children}
      </DashboardShell>
    </Providers>
  )
}
