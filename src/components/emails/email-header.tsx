"use client"

import { format } from "date-fns"
import { ExternalLink } from "lucide-react"
import Link from "next/link"
import { TagInput } from "@/components/tags/tag-input"
import type { EmailDetail, Category } from "@/types/email"

interface EmailHeaderProps {
  email: EmailDetail
  categories: Category[]
  onCategoryChange: (categoryId: string | null) => void
  compact?: boolean
  showFullLink?: boolean
}

export function EmailHeader({
  email,
  categories,
  onCategoryChange,
  compact = false,
  showFullLink = false,
}: EmailHeaderProps) {
  if (compact) {
    return (
      <div className="shrink-0 space-y-2 border-b px-4 py-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
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
              {email.competitor && (
                <Link
                  href={`/competitors/${email.competitor.id}`}
                  className="shrink-0 text-xs text-blue-600 hover:underline"
                >
                  {email.competitor.name}
                </Link>
              )}
              <span className="ml-auto shrink-0 text-xs text-gray-400">
                {format(new Date(email.receivedAt), "MMM d, h:mm a")}
              </span>
            </div>
            <h2 className="mt-1 truncate text-sm font-semibold text-gray-900">
              {email.subject}
            </h2>
          </div>
          {showFullLink && (
            <Link
              href={`/emails/${email.id}`}
              className="mt-0.5 shrink-0 text-gray-400 hover:text-gray-600"
              title="Open full view"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={email.category?.id || ""}
            onChange={(e) => onCategoryChange(e.target.value || null)}
            className="rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-600"
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="min-w-0 flex-1">
            <TagInput emailId={email.id} tags={email.tags} />
          </div>
        </div>
      </div>
    )
  }

  // Full (non-compact) header for detail page
  return (
    <div className="space-y-4 border-b p-6">
      <div className="flex items-start justify-between">
        <h2 className="text-xl font-bold">{email.subject}</h2>
      </div>

      <div className="flex items-center gap-3 text-sm">
        {email.competitor?.colourHex && (
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: email.competitor.colourHex }}
          />
        )}
        <div>
          <span className="font-medium">
            {email.senderName || email.senderAddress}
          </span>
          {email.senderName && (
            <span className="ml-2 text-gray-400">{email.senderAddress}</span>
          )}
        </div>
        {email.competitor && (
          <Link
            href={`/competitors/${email.competitor.id}`}
            className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200"
          >
            {email.competitor.name}
          </Link>
        )}
        <span className="ml-auto shrink-0 text-gray-400">
          {format(new Date(email.receivedAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Category:</span>
        <select
          value={email.category?.id || ""}
          onChange={(e) => onCategoryChange(e.target.value || null)}
          className="rounded border border-gray-200 px-2 py-1 text-sm"
        >
          <option value="">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className="mb-1 block text-sm text-gray-500">Tags:</span>
        <TagInput emailId={email.id} tags={email.tags} />
      </div>
    </div>
  )
}
