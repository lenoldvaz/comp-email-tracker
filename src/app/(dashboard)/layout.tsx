import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardShell } from "./dashboard-shell"
import { Providers } from "./providers"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .single()

  const userName = profile?.name || user.email || ""
  const userRole = profile?.role || "MEMBER"

  return (
    <Providers userId={user.id} userName={userName} userRole={userRole}>
      <DashboardShell userName={userName} userRole={userRole}>
        {children}
      </DashboardShell>
    </Providers>
  )
}
