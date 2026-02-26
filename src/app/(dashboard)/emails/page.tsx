"use client"

import { Suspense, useState, useCallback } from "react"
import { EmailFilters } from "@/components/emails/email-filters"
import { EmailList } from "@/components/emails/email-list"
import { EmailPreview } from "@/components/emails/email-preview"
import { useShell } from "../shell-context"

export default function EmailsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const { setChromeHidden } = useShell()

  const handleFocusToggle = useCallback(() => {
    setFocusMode((prev) => !prev)
    setChromeHidden(!focusMode)
  }, [setChromeHidden, focusMode])

  return (
    <div className="absolute inset-0 flex flex-col">
      {!focusMode && <EmailFilters />}
      <div className="flex min-h-0 flex-1">
        {!focusMode && (
          <div className="flex w-full min-h-0 flex-col border-r lg:w-[320px] lg:shrink-0">
            <Suspense
              fallback={
                <div className="flex-1 space-y-2 p-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-md bg-gray-100" />
                  ))}
                </div>
              }
            >
              <EmailList selectedId={selectedId} onSelect={setSelectedId} />
            </Suspense>
          </div>
        )}
        <div className={`min-h-0 min-w-0 flex-1 flex-col ${focusMode ? "flex" : "hidden lg:flex"}`}>
          {selectedId ? (
            <EmailPreview
              emailId={selectedId}
              focusMode={focusMode}
              onFocusToggle={handleFocusToggle}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Select an email to preview
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
