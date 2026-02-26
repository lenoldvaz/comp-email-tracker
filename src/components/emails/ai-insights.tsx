"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Sparkles, ChevronDown, ChevronRight, RefreshCw, Plus, Check } from "lucide-react"
import { toast } from "sonner"
import { useOrg } from "@/app/(dashboard)/org-context"
import type { EmailDetail, Category } from "@/types/email"

interface AiInsightsProps {
  email: EmailDetail
  categories: Category[]
  onCategoryChange: (categoryId: string | null) => void
}

export function AiInsights({ email, categories, onCategoryChange }: AiInsightsProps) {
  const [open, setOpen] = useState(true)
  const queryClient = useQueryClient()
  const { orgId } = useOrg()

  const reanalyze = useMutation({
    mutationFn: () =>
      fetch(`/api/emails/${email.id}/ai`, { method: "POST" }).then(async (r) => {
        if (!r.ok) {
          const body = await r.json()
          throw new Error(body.error || "AI analysis failed")
        }
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email", email.id] })
      toast.success("AI analysis complete")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const addTag = useMutation({
    mutationFn: (name: string) =>
      fetch(`/api/emails/${email.id}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, orgId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email", email.id] })
      toast.success("Tag added")
    },
    onError: () => toast.error("Failed to add tag"),
  })

  const sentimentColor = {
    positive: "bg-green-100 text-green-700",
    neutral: "bg-gray-100 text-gray-700",
    negative: "bg-red-100 text-red-700",
  }

  const hasAiData = !!email.aiSummary

  // Find matching category ID for the AI suggestion
  const suggestedCategory = email.aiCategory
    ? categories.find(
        (c) => c.name.toLowerCase() === email.aiCategory!.toLowerCase()
      )
    : null
  const categoryAlreadyApplied =
    suggestedCategory && email.category?.id === suggestedCategory.id

  // Filter out AI tags that are already on the email
  const existingTagNames = new Set(email.tags.map((t) => t.name.toLowerCase()))
  const suggestableTags = (email.aiTags || []).filter(
    (t) => !existingTagNames.has(t.toLowerCase())
  )

  return (
    <div className="border-b">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-6 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <Sparkles className="h-4 w-4 text-amber-500" />
        AI Insights
        {!hasAiData && (
          <span className="text-xs font-normal text-gray-400">Not analyzed</span>
        )}
        <div className="flex-1" />
        {open ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {open && (
        <div className="space-y-4 px-6 pb-4">
          {hasAiData ? (
            <>
              {/* Summary */}
              <div>
                <h4 className="mb-1 text-xs font-medium uppercase text-gray-500">
                  Summary
                </h4>
                <p className="text-sm text-gray-700">{email.aiSummary}</p>
              </div>

              {/* Sentiment */}
              {email.aiSentiment && (
                <div>
                  <h4 className="mb-1 text-xs font-medium uppercase text-gray-500">
                    Sentiment
                  </h4>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      sentimentColor[
                        email.aiSentiment as keyof typeof sentimentColor
                      ] || sentimentColor.neutral
                    }`}
                  >
                    {email.aiSentiment}
                  </span>
                </div>
              )}

              {/* Suggested Category */}
              {email.aiCategory && email.aiCategory !== "Uncategorized" && (
                <div>
                  <h4 className="mb-1 text-xs font-medium uppercase text-gray-500">
                    Suggested Category
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                      {email.aiCategory}
                    </span>
                    {suggestedCategory && !categoryAlreadyApplied && (
                      <button
                        onClick={() => onCategoryChange(suggestedCategory.id)}
                        className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        <Check className="h-3 w-3" />
                        Apply
                      </button>
                    )}
                    {categoryAlreadyApplied && (
                      <span className="text-xs text-green-600">Applied</span>
                    )}
                    {!suggestedCategory && (
                      <span className="text-xs text-gray-400">
                        Category not found in org
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Suggested Tags */}
              {email.aiTags && email.aiTags.length > 0 && (
                <div>
                  <h4 className="mb-1 text-xs font-medium uppercase text-gray-500">
                    Suggested Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {email.aiTags.map((tag) => {
                      const alreadyAdded = existingTagNames.has(tag.toLowerCase())
                      return (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
                        >
                          {tag}
                          {!alreadyAdded ? (
                            <button
                              onClick={() => addTag.mutate(tag)}
                              className="hover:text-amber-900"
                              title="Add this tag"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          ) : (
                            <Check className="h-3 w-3 text-green-600" />
                          )}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Re-analyze button */}
              <button
                onClick={() => reanalyze.mutate()}
                disabled={reanalyze.isPending}
                className="inline-flex items-center gap-1.5 rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${reanalyze.isPending ? "animate-spin" : ""}`}
                />
                {reanalyze.isPending ? "Analyzing..." : "Re-analyze"}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                This email has not been analyzed by AI.
              </span>
              <button
                onClick={() => reanalyze.mutate()}
                disabled={reanalyze.isPending}
                className="inline-flex items-center gap-1.5 rounded bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {reanalyze.isPending ? "Analyzing..." : "Analyze now"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
