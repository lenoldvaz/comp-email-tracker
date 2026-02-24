"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { ShellProvider, useShell } from "./shell-context"

function ShellInner({
  children,
  userName,
  userRole,
}: {
  children: React.ReactNode
  userName?: string | null
  userRole?: string | null
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { chromeHidden } = useShell()

  if (chromeHidden) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <main className="relative flex-1 overflow-auto">{children}</main>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isAdmin={userRole === "ADMIN"}
        userName={userName}
        userRole={userRole}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="relative flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}

export function DashboardShell({
  children,
  userName,
  userRole,
}: {
  children: React.ReactNode
  userName?: string | null
  userRole?: string | null
}) {
  return (
    <ShellProvider>
      <ShellInner userName={userName} userRole={userRole}>
        {children}
      </ShellInner>
    </ShellProvider>
  )
}
