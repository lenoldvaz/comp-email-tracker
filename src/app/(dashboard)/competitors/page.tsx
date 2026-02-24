"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useUser } from "../user-context"
import { useState } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface Competitor {
  id: string
  name: string
  domains: string[]
  colourHex: string | null
  _count: { emails: number }
}

export default function CompetitorsPage() {
  const { userRole } = useUser()
  const isAdmin = userRole === "ADMIN"
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: competitors, isLoading } = useQuery<Competitor[]>({
    queryKey: ["competitors"],
    queryFn: () => fetch("/api/competitors").then((r) => r.json()),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/competitors/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitors"] })
      toast.success("Competitor deleted")
    },
  })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Competitors</h1>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingId(null)
              setShowForm(true)
            }}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Competitor
          </button>
        )}
      </div>

      {showForm && (
        <CompetitorForm
          editId={editingId}
          onClose={() => {
            setShowForm(false)
            setEditingId(null)
          }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {competitors?.map((c) => (
            <div key={c.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {c.colourHex && (
                    <span
                      className="inline-block h-4 w-4 rounded-full"
                      style={{ backgroundColor: c.colourHex }}
                    />
                  )}
                  <Link
                    href={`/competitors/${c.id}`}
                    className="font-semibold hover:text-blue-600"
                  >
                    {c.name}
                  </Link>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingId(c.id)
                        setShowForm(true)
                      }}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this competitor?")) {
                          deleteMutation.mutate(c.id)
                        }
                      }}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {c.domains.join(", ")}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {c._count.emails} emails
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CompetitorForm({
  editId,
  onClose,
}: {
  editId: string | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState("")
  const [domains, setDomains] = useState("")
  const [colourHex, setColourHex] = useState("#3B82F6")
  const [loading, setLoading] = useState(false)

  // Load existing data if editing
  useQuery({
    queryKey: ["competitor", editId],
    queryFn: async () => {
      const res = await fetch(`/api/competitors/${editId}`)
      const data = await res.json()
      setName(data.name)
      setDomains(data.domains.join(", "))
      setColourHex(data.colourHex || "#3B82F6")
      return data
    },
    enabled: !!editId,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const body = {
      name,
      domains: domains.split(",").map((d) => d.trim()).filter(Boolean),
      colourHex,
    }

    const res = editId
      ? await fetch(`/api/competitors/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/competitors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ["competitors"] })
      toast.success(editId ? "Competitor updated" : "Competitor added")
      onClose()
    } else {
      const data = await res.json()
      toast.error(data.error || "Failed")
    }
    setLoading(false)
  }

  return (
    <div className="mb-6 rounded-lg border bg-white p-4">
      <h3 className="mb-3 font-medium">
        {editId ? "Edit Competitor" : "Add Competitor"}
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            placeholder="Acme Inc"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500">
            Domains (comma-separated)
          </label>
          <input
            value={domains}
            onChange={(e) => setDomains(e.target.value)}
            required
            className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            placeholder="acme.com, mail.acme.com"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Color</label>
          <input
            type="color"
            value={colourHex}
            onChange={(e) => setColourHex(e.target.value)}
            className="mt-1 h-9 w-12 cursor-pointer rounded border border-gray-300"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
      </form>
    </div>
  )
}
