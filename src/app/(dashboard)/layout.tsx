import { createClient } from "@/lib/supabase/server"
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

  return (
    <Providers userId={userId} userName={userName} userRole={userRole}>
      <DashboardShell userName={userName} userRole={userRole}>
        {children}
      </DashboardShell>
    </Providers>
  )
}
