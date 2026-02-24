"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"

export function DashboardShell({
  children,
  userName,
  userRole,
}: {
  children: React.ReactNode
  userName?: string | null
  userRole?: string | null
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isAdmin={userRole === "ADMIN"}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          userName={userName}
          userRole={userRole}
        />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
