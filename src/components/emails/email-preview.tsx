"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { ExternalLink } from "lucide-react"
import Link from "next/link"
import { TagInput } from "@/components/tags/tag-input"
import { toast } from "sonner"

interface EmailDetail {
  id: string
  subject: string
  senderAddress: string
  senderName: string | null
  receivedAt: string
  bodyText: string | null
  bodyHtml: string | null
  competitor: { id: string; name: string; colourHex: string | null } | null
  category: { id: string; name: string } | null
  tags: { id: string; name: string }[]
}

interface Category {
  id: string
  name: string
}

export function EmailPreview({ emailId }: { emailId: string }) {
  const queryClient = useQueryClient()

  const { data: email, isLoading } = useQuery<EmailDetail>({
    queryKey: ["email", emailId],
    queryFn: () => fetch(`/api/emails/${emailId}`).then((r) => r.json()),
    enabled: !!emailId,
  })

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  })

  const updateCategory = useMutation({
    mutationFn: (categoryId: string | null) =>
      fetch(`/api/emails/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email", emailId] })
      queryClient.invalidateQueries({ queryKey: ["emails"] })
      toast.success("Category updated")
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (!email) return null

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="space-y-3 border-b p-4">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold">{email.subject}</h2>
          <Link
            href={`/emails/${email.id}`}
            className="shrink-0 text-gray-400 hover:text-gray-600"
            title="Open full view"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          {email.competitor?.colourHex && (
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: email.competitor.colourHex }}
            />
          )}
          <span className="font-medium">
            {email.senderName || email.senderAddress}
          </span>
          {email.competitor && (
            <Link
              href={`/competitors/${email.competitor.id}`}
              className="text-blue-600 hover:underline"
            >
              {email.competitor.name}
            </Link>
          )}
          <span className="ml-auto text-gray-400">
            {format(new Date(email.receivedAt), "MMM d, yyyy h:mm a")}
          </span>
        </div>

        {/* Category */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Category:</span>
          <select
            value={email.category?.id || ""}
            onChange={(e) =>
              updateCategory.mutate(e.target.value || null)
            }
            className="rounded border border-gray-200 px-2 py-1 text-xs"
          >
            <option value="">Uncategorized</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <TagInput emailId={email.id} tags={email.tags} />
      </div>

      {/* Body */}
      <div className="flex-1 p-4">
        {email.bodyHtml ? (
          <iframe
            srcDoc={email.bodyHtml}
            sandbox="allow-same-origin"
            className="h-full w-full border-0"
            title="Email content"
            style={{ minHeight: 400 }}
          />
        ) : email.bodyText ? (
          <pre className="whitespace-pre-wrap text-sm text-gray-700">
            {email.bodyText}
          </pre>
        ) : (
          <p className="text-sm text-gray-400">No content available</p>
        )}
      </div>
    </div>
  )
}
