"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { EmailFilters } from "@/components/emails/email-filters"
import { EmailList } from "@/components/emails/email-list"
import { EmailPreview } from "@/components/emails/email-preview"

function EmailsContent() {
  const searchParams = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("selected")
  )

  return (
    <div className="absolute inset-0 flex flex-col">
      <EmailFilters />
      <div className="flex min-h-0 flex-1">
        <div className="flex w-full min-h-0 flex-col border-r lg:w-2/5">
          <EmailList selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="hidden min-h-0 flex-1 lg:block">
          {selectedId ? (
            <EmailPreview emailId={selectedId} />
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

export default function EmailsPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" /></div>}>
      <EmailsContent />
    </Suspense>
  )
}
