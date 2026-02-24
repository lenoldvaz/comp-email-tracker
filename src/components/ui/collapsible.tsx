"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface CollapsibleProps {
  title: string
  count?: number
  defaultOpen?: boolean
  action?: React.ReactNode
  children: React.ReactNode
}

export function Collapsible({
  title,
  count,
  defaultOpen = false,
  action,
  children,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b last:border-b-0">
      <div className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(!open)}
          onKeyDown={(e) => e.key === "Enter" && setOpen(!open)}
          className="flex flex-1 cursor-pointer items-center gap-2 hover:text-gray-900"
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-gray-400 transition-transform",
              open && "rotate-90"
            )}
          />
          <span>{title}</span>
          {count != null && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {count}
            </span>
          )}
        </div>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}
