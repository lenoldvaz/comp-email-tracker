"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useUser } from "../user-context"
import { useRouter } from "next/navigation"
import { Trash2, Pencil } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"

interface Tag {
  id: string
  name: string
  _count: { emails: number }
}

export default function TagsPage() {
  const { userRole } = useUser()
  const isAdmin = userRole === "ADMIN"
  const router = useRouter()
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  const { data: tags, isLoading } = useQuery<Tag[]>({
    queryKey: ["tags", ""],
    queryFn: () => fetch("/api/tags").then((r) => r.json()),
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      fetch(`/api/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] })
      setEditingId(null)
      toast.success("Tag renamed")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/tags/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] })
      toast.success("Tag deleted")
    },
  })

  // Sort by email count descending
  const sortedTags = tags?.sort((a, b) => b._count.emails - a._count.emails)

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Tags</h1>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      ) : sortedTags?.length === 0 ? (
        <p className="text-sm text-gray-500">
          No tags yet. Add tags to emails from the email preview pane.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Tag</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Emails</th>
                {isAdmin && (
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedTags?.map((tag) => (
                <tr key={tag.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    {editingId === tag.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          renameMutation.mutate({ id: tag.id, name: editName })
                        }}
                        className="flex gap-2"
                      >
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1 text-sm"
                          autoFocus
                        />
                        <button type="submit" className="text-blue-600 text-xs">Save</button>
                        <button type="button" onClick={() => setEditingId(null)} className="text-gray-400 text-xs">Cancel</button>
                      </form>
                    ) : (
                      <button
                        onClick={() =>
                          router.push(`/emails?tagId=${tag.id}`)
                        }
                        className="rounded bg-blue-50 px-2 py-0.5 text-blue-700 hover:bg-blue-100"
                      >
                        {tag.name}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {tag._count.emails}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingId(tag.id)
                            setEditName(tag.name)
                          }}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete tag "${tag.name}"?`)) {
                              deleteMutation.mutate(tag.id)
                            }
                          }}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
