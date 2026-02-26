"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Trash2, Code, X } from "lucide-react"
import { useOrg } from "@/app/(dashboard)/org-context"
import { toast } from "sonner"
import type { EmailSnippet } from "@/types/draft"

interface SnippetManagerProps {
  onInsert: (html: string) => void
  onClose: () => void
}

export function SnippetManager({ onInsert, onClose }: SnippetManagerProps) {
  const { orgId } = useOrg()
  const [snippets, setSnippets] = useState<EmailSnippet[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newHtml, setNewHtml] = useState("")

  useEffect(() => {
    fetchSnippets()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  async function fetchSnippets() {
    const res = await fetch(`/api/snippets?orgId=${orgId}`)
    if (res.ok) setSnippets(await res.json())
    setLoading(false)
  }

  async function createSnippet() {
    if (!newName.trim() || !newHtml.trim()) return
    const res = await fetch("/api/snippets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, name: newName, description: newDescription, htmlContent: newHtml }),
    })
    if (res.ok) {
      toast.success("Snippet created")
      setShowCreate(false)
      setNewName("")
      setNewDescription("")
      setNewHtml("")
      fetchSnippets()
    } else {
      toast.error("Failed to create snippet")
    }
  }

  async function deleteSnippet(id: string) {
    if (!confirm("Delete this snippet?")) return
    const res = await fetch(`/api/snippets/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Snippet deleted")
      setSnippets((s) => s.filter((sn) => sn.id !== id))
    }
  }

  const filtered = snippets.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Snippets</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-3 w-3" />
              New
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {showCreate && (
          <div className="mb-4 space-y-2 rounded-md border bg-gray-50 p-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Snippet name"
              className="w-full rounded border px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full rounded border px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
            <textarea
              value={newHtml}
              onChange={(e) => setNewHtml(e.target.value)}
              placeholder="HTML content"
              rows={4}
              className="w-full rounded border px-2 py-1.5 font-mono text-xs focus:border-blue-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-200">Cancel</button>
              <button onClick={createSnippet} className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700">Save</button>
            </div>
          </div>
        )}

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search snippets..."
            className="w-full rounded border py-1.5 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">No snippets found</div>
        ) : (
          <div className="max-h-64 space-y-1 overflow-auto">
            {filtered.map((snippet) => (
              <div
                key={snippet.id}
                className="group flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-gray-50"
              >
                <Code className="h-4 w-4 flex-shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{snippet.name}</p>
                  {snippet.description && (
                    <p className="truncate text-xs text-gray-500">{snippet.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => { onInsert(snippet.htmlContent); onClose() }}
                    className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    Insert
                  </button>
                  <button
                    onClick={() => deleteSnippet(snippet.id)}
                    className="rounded p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
