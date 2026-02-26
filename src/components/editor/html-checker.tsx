"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronRight, AlertTriangle, XCircle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface CheckResult {
  severity: "error" | "warning" | "info"
  message: string
  line?: number
}

const DEPRECATED_TAGS = ["font", "center", "marquee", "blink", "strike", "big", "small", "tt"]
const UNSUPPORTED_CSS = [
  { pattern: /display\s*:\s*flex/gi, msg: "display:flex is not supported in many email clients" },
  { pattern: /display\s*:\s*grid/gi, msg: "display:grid is not supported in email clients" },
  { pattern: /position\s*:\s*(fixed|sticky)/gi, msg: "position:fixed/sticky is not supported" },
  { pattern: /@media\s+\(prefers-color-scheme/gi, msg: "prefers-color-scheme has limited email support" },
  { pattern: /animation\s*:/gi, msg: "CSS animations are not supported in most email clients" },
  { pattern: /transform\s*:/gi, msg: "CSS transforms are not supported in most email clients" },
]

function checkHtml(html: string): CheckResult[] {
  if (!html.trim()) return []
  const results: CheckResult[] = []
  const lines = html.split("\n")

  // Check deprecated tags
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase()
    for (const tag of DEPRECATED_TAGS) {
      if (line.includes(`<${tag}`) || line.includes(`</${tag}`)) {
        results.push({ severity: "warning", message: `Deprecated <${tag}> tag used`, line: i + 1 })
      }
    }
  }

  // Check unsupported CSS
  for (const { pattern, msg } of UNSUPPORTED_CSS) {
    pattern.lastIndex = 0
    if (pattern.test(html)) {
      results.push({ severity: "warning", message: msg })
    }
  }

  // Check images without alt
  const imgRegex = /<img\s[^>]*>/gi
  let match
  while ((match = imgRegex.exec(html)) !== null) {
    if (!match[0].includes("alt=") || /alt=["']\s*["']/.test(match[0])) {
      const line = html.substring(0, match.index).split("\n").length
      results.push({ severity: "error", message: "Image missing alt text", line })
    }
  }

  // Check for no doctype
  if (!html.trim().toLowerCase().startsWith("<!doctype")) {
    results.push({ severity: "info", message: "Missing <!DOCTYPE html> declaration" })
  }

  // Check for viewport meta
  if (!html.includes("viewport")) {
    results.push({ severity: "info", message: 'Missing <meta name="viewport"> tag' })
  }

  // File size warning
  const sizeKB = new Blob([html]).size / 1024
  if (sizeKB > 102) {
    results.push({ severity: "error", message: `HTML is ${sizeKB.toFixed(0)}KB — Gmail clips at 102KB` })
  } else if (sizeKB > 80) {
    results.push({ severity: "warning", message: `HTML is ${sizeKB.toFixed(0)}KB — approaching Gmail's 102KB limit` })
  }

  return results
}

interface HtmlCheckerProps {
  html: string
  className?: string
}

export function HtmlChecker({ html, className }: HtmlCheckerProps) {
  const [expanded, setExpanded] = useState(true)
  const results = useMemo(() => checkHtml(html), [html])

  const errors = results.filter((r) => r.severity === "error")
  const warnings = results.filter((r) => r.severity === "warning")

  if (results.length === 0) return null

  return (
    <div className={cn("border-t bg-white", className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-600 hover:bg-gray-50"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span>Issues</span>
        {errors.length > 0 && (
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">{errors.length} error{errors.length > 1 ? "s" : ""}</span>
        )}
        {warnings.length > 0 && (
          <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">{warnings.length} warning{warnings.length > 1 ? "s" : ""}</span>
        )}
      </button>
      {expanded && (
        <div className="max-h-40 overflow-auto border-t">
          {results.map((result, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-1.5 text-xs">
              {result.severity === "error" && <XCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-500" />}
              {result.severity === "warning" && <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-yellow-500" />}
              {result.severity === "info" && <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-blue-500" />}
              <span className="text-gray-700">{result.message}</span>
              {result.line && <span className="ml-auto text-gray-400">line {result.line}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
