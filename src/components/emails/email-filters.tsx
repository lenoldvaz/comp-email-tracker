"use client"

import { useQuery } from "@tanstack/react-query"
import { useSearchParams, useRouter } from "next/navigation"
import { Search, X } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { useState, useEffect, useRef, useCallback } from "react"

interface Competitor {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
}

export function EmailFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "")
  const debouncedSearch = useDebounce(searchInput, 300)

  // Keep a ref to searchParams so updateParam doesn't depend on it
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams

  const { data: competitors } = useQuery<Competitor[]>({
    queryKey: ["competitors"],
    queryFn: () => fetch("/api/competitors").then((r) => r.json()),
  })

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  })

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParamsRef.current.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete("page")
      router.push(`/emails?${params.toString()}`)
    },
    [router]
  )

  useEffect(() => {
    const current = searchParamsRef.current.get("q") || ""
    const next = debouncedSearch || ""
    if (current !== next) {
      updateParam("q", next || null)
    }
  }, [debouncedSearch, updateParam])

  const hasFilters =
    searchParams.get("q") ||
    searchParams.get("competitorId") ||
    searchParams.get("categoryId") ||
    searchParams.get("dateFrom") ||
    searchParams.get("dateTo")

  return (
    <div className="border-b bg-white px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search emails..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-48 rounded-md border border-gray-300 py-1.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={searchParams.get("competitorId") || ""}
          onChange={(e) => updateParam("competitorId", e.target.value || null)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All competitors</option>
          {competitors?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("categoryId") || ""}
          onChange={(e) => updateParam("categoryId", e.target.value || null)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={searchParams.get("dateFrom") || ""}
          onChange={(e) => updateParam("dateFrom", e.target.value || null)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          placeholder="From"
        />
        <input
          type="date"
          value={searchParams.get("dateTo") || ""}
          onChange={(e) => updateParam("dateTo", e.target.value || null)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          placeholder="To"
        />

        <select
          value={searchParams.get("sort") || "date_desc"}
          onChange={(e) => updateParam("sort", e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
          <option value="competitor">By competitor</option>
          <option value="category">By category</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => router.push("/emails")}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
    </div>

  )
}
