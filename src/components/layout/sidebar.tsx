"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Mail,
  Users,
  FolderOpen,
  Tags,
  BarChart3,
  Settings,
  ScrollText,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils/cn"

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
}: {
  open: boolean
  onClose: () => void
  isAdmin: boolean
}) {
  const pathname = usePathname()

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
          <Link href="/emails" className="text-lg font-bold">
            Email Tracker
          </Link>
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

          {isAdmin && (
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
      </aside>
    </>
  )
}
