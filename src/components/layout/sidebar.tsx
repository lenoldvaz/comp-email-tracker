"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Mail,
  Users,
  FolderOpen,
  Tags,
  BarChart3,
  Settings,
  ScrollText,
  X,
  LogOut,
  Building2,
  ChevronDown,
  Plus,
} from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { createClient } from "@/lib/supabase/client"
import { useOrg } from "@/app/(dashboard)/org-context"
import { useState } from "react"

const navItems = [
  { href: "/emails", label: "Emails", icon: Mail },
  { href: "/competitors", label: "Competitors", icon: Users },
  { href: "/categories", label: "Categories", icon: FolderOpen },
  { href: "/tags", label: "Tags", icon: Tags },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
]

const adminItems = [
  { href: "/ingestion-log", label: "Ingestion Log", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar({
  open,
  onClose,
  isAdmin,
  isViewer,
  userName,
  userRole,
}: {
  open: boolean
  onClose: () => void
  isAdmin: boolean
  isViewer?: boolean
  userName?: string | null
  userRole?: string | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { orgName, orgs, orgId } = useOrg()
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  function handleOrgSwitch(newOrgId: string) {
    // Store preference and reload
    document.cookie = `activeOrgId=${newOrgId};path=/;max-age=${60 * 60 * 24 * 365}`
    setOrgDropdownOpen(false)
    router.refresh()
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r bg-white transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b px-4 py-4">
          <div className="relative flex-1">
            <button
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              className="flex w-full items-center gap-2 text-left"
            >
              <Building2 className="h-4 w-4 text-gray-500" />
              <span className="flex-1 truncate text-sm font-bold">{orgName || "Email Tracker"}</span>
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>
            {orgDropdownOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-white py-1 shadow-lg">
                {orgs.map((org) => (
                  <button
                    key={org.orgId}
                    onClick={() => handleOrgSwitch(org.orgId)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50",
                      org.orgId === orgId && "bg-blue-50 text-blue-700"
                    )}
                  >
                    <Building2 className="h-3 w-3" />
                    <span className="flex-1 truncate">{org.orgName}</span>
                    <span className="text-xs text-gray-400">{org.role}</span>
                  </button>
                ))}
                <div className="border-t my-1" />
                <button
                  onClick={() => {
                    setOrgDropdownOpen(false)
                    router.push("/settings/team")
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
                >
                  <Plus className="h-3 w-3" />
                  <span>New Organization</span>
                </button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}

          {isAdmin && !isViewer && (
            <>
              <div className="my-3 border-t" />
              {adminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith(item.href)
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        {userName && (
          <div className="mt-auto border-t px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="truncate text-sm text-gray-600">
                {userName}
                {userRole && (
                  <span
                    className={cn(
                      "ml-1 rounded px-1.5 py-0.5 text-xs font-medium",
                      userRole === "ADMIN"
                        ? "bg-blue-100 text-blue-700"
                        : userRole === "VIEWER"
                          ? "bg-gray-100 text-gray-500"
                          : "bg-green-100 text-green-700"
                    )}
                  >
                    {userRole}
                  </span>
                )}
              </span>
              <button
                onClick={handleSignOut}
                className="flex-shrink-0 text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
