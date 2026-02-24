"use client"

import { Suspense } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { cn } from "@/lib/utils/cn"

interface IngestionLogEntry {
  id: string
  messageId: string | null
  status: string
  errorMessage: string | null
  processedAt: string
}

interface LogResponse {
  logs: IngestionLogEntry[]
  total: number
  page: number
  pageSize: number
}

const statusColors: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  duplicate: "bg-yellow-100 text-yellow-700",
  skipped: "bg-gray-100 text-gray-600",
}

function IngestionLogContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const status = searchParams.get("status") || ""
  const page = parseInt(searchParams.get("page") || "1", 10)

  const { data, isLoading } = useQuery<LogResponse>({
    queryKey: ["ingestion-log", status, page],
    queryFn: () => {
      const params = new URLSearchParams()
      if (status) params.set("status", status)
      params.set("page", String(page))
      return fetch(`/api/ingestion/log?${params}`).then((r) => r.json())
    },
  })

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Ingestion Log</h1>

      {/* Filter by status */}
      <div className="mb-4 flex gap-2">
        {["", "success", "failed", "duplicate", "skipped"].map((s) => (
          <button
            key={s}
            onClick={() => {
              const params = new URLSearchParams()
              if (s) params.set("status", s)
              router.push(`/ingestion-log?${params}`)
            }}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              (status || "") === s
                ? "bg-blue-100 text-blue-700"
                : "text-gray-500 hover:bg-gray-100"
            )}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Message ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Error</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={4} className="px-4 py-3">
                      <div className="h-5 animate-pulse rounded bg-gray-100" />
                    </td>
                  </tr>
                ))
              : data?.logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-gray-600">
                      {format(new Date(log.processedAt), "MMM d, h:mm:ss a")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-xs font-medium",
                          statusColors[log.status] || "bg-gray-100"
                        )}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 font-mono text-xs text-gray-500">
                      {log.messageId || "—"}
                    </td>
                    <td className="max-w-[300px] truncate px-4 py-3 text-red-600">
                      {log.errorMessage || "—"}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-500">{data?.total} entries</span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString())
                params.set("page", String(page - 1))
                router.push(`/ingestion-log?${params}`)
              }}
              className="rounded border px-2 py-1 text-xs disabled:opacity-50"
            >
              Prev
            </button>
            <span className="px-2 py-1 text-xs text-gray-500">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString())
                params.set("page", String(page + 1))
                router.push(`/ingestion-log?${params}`)
              }}
              className="rounded border px-2 py-1 text-xs disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function IngestionLogPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" /></div>}>
      <IngestionLogContent />
    </Suspense>
  )
}
