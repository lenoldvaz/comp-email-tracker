"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDebounce } from "@/hooks/use-debounce"
import { X } from "lucide-react"
import { toast } from "sonner"

interface Tag {
  id: string
  name: string
}

export function TagInput({
  emailId,
  tags,
}: {
  emailId: string
  tags: Tag[]
}) {
  const [input, setInput] = useState("")
  const debouncedInput = useDebounce(input, 200)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const queryClient = useQueryClient()

  const { data: suggestions } = useQuery<(Tag & { _count: { emails: number } })[]>({
    queryKey: ["tags", debouncedInput],
    queryFn: () =>
      fetch(`/api/tags?q=${encodeURIComponent(debouncedInput)}`).then((r) =>
        r.json()
      ),
    enabled: debouncedInput.length > 0,
  })

  const addTag = useMutation({
    mutationFn: (name: string) =>
      fetch(`/api/emails/${emailId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email", emailId] })
      queryClient.invalidateQueries({ queryKey: ["emails"] })
      setInput("")
      setShowSuggestions(false)
    },
    onError: () => toast.error("Failed to add tag"),
  })

  const removeTag = useMutation({
    mutationFn: (tagId: string) =>
      fetch(`/api/emails/${emailId}/tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email", emailId] })
      queryClient.invalidateQueries({ queryKey: ["emails"] })
    },
    onError: () => toast.error("Failed to remove tag"),
  })

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault()
      addTag.mutate(input.trim())
    }
  }

  const filteredSuggestions = suggestions?.filter(
    (s) => !tags.some((t) => t.id === s.id)
  )

  return (
    <div>
      {/* Existing tags */}
      <div className="mb-2 flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
          >
            {tag.name}
            <button
              onClick={() => removeTag.mutate(tag.id)}
              className="hover:text-blue-900"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Tag input with autocomplete */}
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setShowSuggestions(true)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Add tag..."
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {showSuggestions && filteredSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border bg-white py-1 shadow-lg">
            {filteredSuggestions.map((tag) => (
              <button
                key={tag.id}
                onMouseDown={(e) => {
                  e.preventDefault()
                  addTag.mutate(tag.name)
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-gray-50"
              >
                <span>{tag.name}</span>
                <span className="text-xs text-gray-400">{tag._count.emails}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
