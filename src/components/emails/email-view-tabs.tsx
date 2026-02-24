"use client"

import { Monitor, Smartphone, Code, FileText, Info } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import type { EmailViewMode } from "@/types/email"

interface EmailViewTabsProps {
  activeView: EmailViewMode
  onViewChange: (view: EmailViewMode) => void
  hasHtml: boolean
  hasText: boolean
}

const tabs: { id: EmailViewMode; label: string; icon: React.ElementType; needsHtml?: boolean; needsText?: boolean }[] = [
  { id: "desktop", label: "Desktop", icon: Monitor, needsHtml: true },
  { id: "mobile", label: "Mobile", icon: Smartphone, needsHtml: true },
  { id: "code", label: "Code", icon: Code, needsHtml: true },
  { id: "text", label: "Text", icon: FileText, needsText: true },
  { id: "info", label: "Info", icon: Info },
]

export function EmailViewTabs({
  activeView,
  onViewChange,
  hasHtml,
  hasText,
}: EmailViewTabsProps) {
  return (
    <div className="flex items-center gap-0.5">
      {tabs.map((tab) => {
        const disabled =
          (tab.needsHtml && !hasHtml) || (tab.needsText && !hasText)
        const active = activeView === tab.id
        const Icon = tab.icon

        return (
          <button
            key={tab.id}
            onClick={() => !disabled && onViewChange(tab.id)}
            disabled={disabled}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              active
                ? "bg-blue-100 text-blue-700"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700",
              disabled && "cursor-not-allowed opacity-40"
            )}
            title={tab.label}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}
    </div>
  )
}
