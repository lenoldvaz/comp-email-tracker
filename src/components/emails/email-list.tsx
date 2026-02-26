"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface EmailListItem {
  id: string
  subject: string
  senderAddress: string
  senderName: string | null
  receivedAt: string
  snippet: string | null
  competitor: { id: string; name: string; colourHex: string | null } | null
  category: { id: string; name: string } | null
  tags: { id: string; name: string }[]
  aiSummary: string | null
}

interface EmailListResponse {
  emails: EmailListItem[]
  total: number
  page: number
  pageSize: number
}

export function EmailList({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const queryString = searchParams.toString()
  const { data, isLoading } = useQuery<EmailListResponse>({
    queryKey: ["emails", queryString],
    queryFn: () => fetch(`/api/emails?${queryString}`).then((r) => r.json()),
  })

  const emails = data?.emails || []
  const total = data?.total || 0
  const page = data?.page || 1
  const pageSize = data?.pageSize || 50
  const totalPages = Math.ceil(total / pageSize)

  if (isLoading) {
    return (
      <div className="flex-1 space-y-2 p-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-md bg-gray-100" />
        ))}
      </div>
    )
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-gray-500">
        No emails found
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {emails.map((email) => (
          <button
            key={email.id}
            onClick={() => onSelect(email.id)}
            className={cn(
              "flex w-full flex-col gap-1 border-b px-4 py-3 text-left transition-colors hover:bg-gray-50",
              selectedId === email.id && "bg-blue-50"
            )}
          >
            <div className="flex items-center gap-2">
              {email.competitor?.colourHex && (
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: email.competitor.colourHex }}
                />
              )}
              <span className="truncate text-sm font-medium text-gray-900">
                {email.senderName || email.senderAddress}
              </span>
              <span className="ml-auto shrink-0 text-xs text-gray-400">
                {format(new Date(email.receivedAt), "MMM d")}
              </span>
            </div>
            <div className="truncate text-sm text-gray-700">{email.subject}</div>
            <div className="flex items-center gap-2">
              {email.snippet && (
                <span className="truncate text-xs text-gray-400">
                  {email.snippet}
                </span>
              )}
            </div>
            {email.aiSummary && (
              <div className="flex items-center gap-1 truncate text-xs text-amber-600">
                <Sparkles className="h-3 w-3 shrink-0" />
                <span className="truncate">{email.aiSummary}</span>
              </div>
            )}
            {(email.tags.length > 0 || email.category) && (
              <div className="flex flex-wrap gap-1">
                {email.category && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                    {email.category.name}
                  </span>
                )}
                {email.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t bg-white px-4 py-2">
          <span className="text-xs text-gray-500">
            {total} emails
          </span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString())
                params.set("page", String(page - 1))
                router.push(`/emails?${params.toString()}`)
              }}
              className="rounded border px-2 py-1 text-xs disabled:opacity-50"
            >
              Prev
            </button>
            <span className="px-2 py-1 text-xs text-gray-500">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString())
                params.set("page", String(page + 1))
                router.push(`/emails?${params.toString()}`)
              }}
              className="rounded border px-2 py-1 text-xs disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
