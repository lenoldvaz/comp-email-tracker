"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Copy, Trash2, FileText, LayoutTemplate } from "lucide-react"
import { useOrg } from "@/app/(dashboard)/org-context"
import { cn } from "@/lib/utils/cn"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import type { EmailDraft } from "@/types/draft"

export default function DraftsPage() {
  const { orgId } = useOrg()
  const router = useRouter()
  const [drafts, setDrafts] = useState<EmailDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [templates, setTemplates] = useState<EmailDraft[]>([])

  useEffect(() => {
    if (!orgId) return
    fetchDrafts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, search])

  async function fetchDrafts() {
    setLoading(true)
    const params = new URLSearchParams({ orgId })
    if (search) params.set("q", search)
    const res = await fetch(`/api/drafts?${params}`)
    if (res.ok) {
      setDrafts(await res.json())
    }
    setLoading(false)
  }

  async function createDraft(fromTemplate?: EmailDraft) {
    const body: Record<string, unknown> = { orgId }
    if (fromTemplate) {
      body.title = `${fromTemplate.title} (Copy)`
      body.subject = fromTemplate.subject
      body.htmlContent = fromTemplate.htmlContent
    }
    const res = await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const draft = await res.json()
      router.push(`/drafts/${draft.id}`)
    } else {
      toast.error("Failed to create draft")
    }
  }

  async function duplicateDraft(id: string) {
    const res = await fetch(`/api/drafts/${id}/duplicate`, { method: "POST" })
    if (res.ok) {
      toast.success("Draft duplicated")
      fetchDrafts()
    } else {
      toast.error("Failed to duplicate draft")
    }
  }

  async function deleteDraft(id: string) {
    if (!confirm("Delete this draft?")) return
    const res = await fetch(`/api/drafts/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Draft deleted")
      setDrafts((d) => d.filter((draft) => draft.id !== id))
    } else {
      toast.error("Failed to delete draft")
    }
  }

  async function openTemplatePicker() {
    const res = await fetch(`/api/templates?orgId=${orgId}`)
    if (res.ok) setTemplates(await res.json())
    setShowTemplatePicker(true)
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Email Drafts</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={openTemplatePicker}
            className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <LayoutTemplate className="h-4 w-4" />
            From Template
          </button>
          <button
            onClick={() => createDraft()}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Draft
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search drafts..."
            className="w-full rounded-md border py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-500">Loading...</div>
      ) : drafts.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed py-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No drafts yet</p>
          <button
            onClick={() => createDraft()}
            className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Create your first draft
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              onClick={() => router.push(`/drafts/${draft.id}`)}
              className="group flex cursor-pointer items-center justify-between rounded-lg border bg-white p-4 transition-shadow hover:shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-medium text-gray-900">{draft.title}</h3>
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  {draft.subject || "No subject"}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Updated {formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true })}
                </p>
              </div>
              <div className="ml-4 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => { e.stopPropagation(); duplicateDraft(draft.id) }}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title="Duplicate"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteDraft(draft.id) }}
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Picker Modal */}
      {showTemplatePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowTemplatePicker(false)}>
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold">Create from Template</h2>
            {templates.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No templates available. Save a draft as a template first.</p>
            ) : (
              <div className="grid max-h-80 gap-2 overflow-auto">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setShowTemplatePicker(false); createDraft(t) }}
                    className="flex items-center gap-3 rounded-md border p-3 text-left hover:bg-gray-50"
                  >
                    <LayoutTemplate className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.templateName || t.title}</p>
                      <p className="truncate text-xs text-gray-500">{t.subject || "No subject"}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowTemplatePicker(false)}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
