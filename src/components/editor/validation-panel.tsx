"use client"

import { useState } from "react"
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, ChevronDown, ChevronRight, Shield } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import type { ValidationResult } from "@/types/draft"

interface ValidationPanelProps {
  draftId: string
}

const CATEGORY_LABELS: Record<string, string> = {
  links: "Links",
  images: "Images",
  accessibility: "Accessibility",
  spam: "Spam Score",
  clipping: "Gmail Clipping",
}

export function ValidationPanel({ draftId }: ValidationPanelProps) {
  const [results, setResults] = useState<ValidationResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  async function runValidation() {
    setLoading(true)
    try {
      const res = await fetch(`/api/drafts/${draftId}/validate`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setResults(data.results)
        // Auto-expand categories with issues
        const autoExpand: Record<string, boolean> = {}
        for (const r of data.results) {
          if (r.items.some((item: { severity: string }) => item.severity !== "pass")) {
            autoExpand[r.category] = true
          }
        }
        setExpanded(autoExpand)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  function toggleCategory(category: string) {
    setExpanded((prev) => ({ ...prev, [category]: !prev[category] }))
  }

  const SeverityIcon = ({ severity }: { severity: string }) => {
    switch (severity) {
      case "pass": return <CheckCircle className="h-3 w-3 text-green-500" />
      case "warn": return <AlertTriangle className="h-3 w-3 text-yellow-500" />
      case "fail": return <XCircle className="h-3 w-3 text-red-500" />
      default: return null
    }
  }

  return (
    <div className="border-t">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">Validation</span>
        </div>
        <button
          onClick={runValidation}
          disabled={loading}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          {loading ? "Checking..." : "Run Checks"}
        </button>
      </div>

      {results && (
        <div className="border-t">
          {results.map((result) => {
            const hasIssues = result.items.some((i) => i.severity !== "pass")
            const isExpanded = expanded[result.category]

            return (
              <div key={result.category} className="border-b last:border-b-0">
                <button
                  onClick={() => toggleCategory(result.category)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-100"
                >
                  {isExpanded ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
                  <span className="flex-1 font-medium text-gray-700">{CATEGORY_LABELS[result.category]}</span>
                  {hasIssues ? (
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                  ) : (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-2">
                    {result.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-1.5 py-1">
                        <SeverityIcon severity={item.severity} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-600">{item.message}</p>
                          {item.details && (
                            <p className="mt-0.5 truncate text-xs text-gray-400">{item.details}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
