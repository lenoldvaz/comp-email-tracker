"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useUser } from "../user-context"
import { useState } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Category {
  id: string
  name: string
  isSystem: boolean
  _count: { emails: number }
}

export default function CategoriesPage() {
  const { userRole } = useUser()
  const isAdmin = userRole === "ADMIN"
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  })

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed")
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setNewName("")
      toast.success("Category created")
    },
    onError: () => toast.error("Failed to create category"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setEditingId(null)
      toast.success("Category updated")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/categories/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw r.json()
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      toast.success("Category deleted")
    },
    onError: () => toast.error("Cannot delete this category"),
  })

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Categories</h1>

      {isAdmin && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (newName.trim()) createMutation.mutate(newName.trim())
          }}
          className="mb-6 flex gap-2"
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Emails</th>
              {isAdmin && (
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={4} className="px-4 py-3">
                      <div className="h-5 animate-pulse rounded bg-gray-100" />
                    </td>
                  </tr>
                ))
              : categories?.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      {editingId === c.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault()
                            updateMutation.mutate({ id: c.id, name: editName })
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
                        c.name
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.isSystem ? (
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          System
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Custom</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {c._count.emails}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingId(c.id)
                              setEditName(c.name)
                            }}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (c.isSystem) {
                                toast.error("Cannot delete system categories")
                                return
                              }
                              if (confirm("Delete this category?")) {
                                deleteMutation.mutate(c.id)
                              }
                            }}
                            disabled={c.isSystem}
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
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
    </div>
  )
}
