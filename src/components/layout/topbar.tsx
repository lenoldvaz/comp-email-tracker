"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Menu, LogOut } from "lucide-react"

export function Topbar({
  onMenuToggle,
  userName,
  userRole,
}: {
  onMenuToggle: () => void
  userName?: string | null
  userRole?: string | null
}) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-4">
      <button onClick={onMenuToggle} className="lg:hidden">
        <Menu className="h-5 w-5" />
      </button>

      <div className="lg:hidden" />

      <div className="flex items-center gap-4">
        {userName && (
          <>
            <span className="text-sm text-gray-600">
              {userName}
              {userRole === "ADMIN" && (
                <span className="ml-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                  Admin
                </span>
              )}
            </span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </header>
  )
}
