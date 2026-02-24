"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { ArrowLeft } from "lucide-react"
import { TagInput } from "@/components/tags/tag-input"
import { toast } from "sonner"
import Link from "next/link"

interface EmailDetail {
  id: string
  subject: string
  senderAddress: string
  senderName: string | null
  receivedAt: string
  bodyText: string | null
  bodyHtml: string | null
  messageId: string
  competitor: { id: string; name: string; colourHex: string | null } | null
  category: { id: string; name: string } | null
  tags: { id: string; name: string }[]
}

interface Category {
  id: string
  name: string
}

export default function EmailDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: email, isLoading } = useQuery<EmailDetail>({
    queryKey: ["email", id],
    queryFn: () => fetch(`/api/emails/${id}`).then((r) => r.json()),
  })

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  })

  const updateCategory = useMutation({
    mutationFn: (categoryId: string | null) =>
      fetch(`/api/emails/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email", id] })
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

  if (!email) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        Email not found
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to list
      </button>

      <div className="rounded-lg border bg-white">
        {/* Header */}
        <div className="space-y-4 border-b p-6">
          <h1 className="text-xl font-bold">{email.subject}</h1>

          <div className="flex items-center gap-3 text-sm">
            {email.competitor?.colourHex && (
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: email.competitor.colourHex }}
              />
            )}
            <div>
              <span className="font-medium">
                {email.senderName || email.senderAddress}
              </span>
              <span className="ml-2 text-gray-400">{email.senderAddress}</span>
            </div>
            {email.competitor && (
              <Link
                href={`/competitors/${email.competitor.id}`}
                className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200"
              >
                {email.competitor.name}
              </Link>
            )}
          </div>

          <div className="text-sm text-gray-400">
            {format(new Date(email.receivedAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
          </div>

          {/* Category */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Category:</span>
            <select
              value={email.category?.id || ""}
              onChange={(e) =>
                updateCategory.mutate(e.target.value || null)
              }
              className="rounded border border-gray-200 px-2 py-1 text-sm"
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
          <div>
            <span className="mb-1 block text-sm text-gray-500">Tags:</span>
            <TagInput emailId={email.id} tags={email.tags} />
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {email.bodyHtml ? (
            <iframe
              srcDoc={email.bodyHtml}
              sandbox="allow-same-origin"
              className="w-full border-0"
              title="Email content"
              style={{ minHeight: 600 }}
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
    </div>
  )
}
