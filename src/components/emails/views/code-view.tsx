"use client"

import { useState, useMemo, useRef, useCallback, useEffect } from "react"
import { Copy, Check, Moon, Sun } from "lucide-react"
import { toast } from "sonner"
import { highlightHtml, annotateHtml } from "@/lib/utils/html-extract"
import { cn } from "@/lib/utils/cn"

interface CodeViewProps {
  bodyHtml: string | null
}

const MAX_LENGTH = 100_000

/** Simple HTML pretty-printer — adds newlines and indentation */
function formatHtml(html: string): string {
  let formatted = ""
  let indent = 0
  const tab = "  "

  // Normalize: collapse whitespace between tags
  const tokens = html.replace(/>\s+</g, "><").split(/(<[^>]+>)/g)

  for (const token of tokens) {
    if (!token.trim()) continue

    if (token.startsWith("</")) {
      // Closing tag — decrease indent first
      indent = Math.max(0, indent - 1)
      formatted += tab.repeat(indent) + token + "\n"
    } else if (token.startsWith("<") && !token.startsWith("<!")) {
      // Opening or self-closing tag
      formatted += tab.repeat(indent) + token + "\n"
      // Only increase indent for non-void, non-self-closing tags
      const isSelfClosing = token.endsWith("/>")
      const voidTags = /^<(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)\b/i
      if (!isSelfClosing && !voidTags.test(token)) {
        indent++
      }
    } else if (token.startsWith("<!")) {
      // Comments, doctype
      formatted += tab.repeat(indent) + token + "\n"
    } else {
      // Text content
      const trimmed = token.trim()
      if (trimmed) {
        formatted += tab.repeat(indent) + trimmed + "\n"
      }
    }
  }

  return formatted.trimEnd()
}

export function CodeView({ bodyHtml }: CodeViewProps) {
  const [copied, setCopied] = useState(false)
  const [showFull, setShowFull] = useState(false)
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const codeRef = useRef<HTMLPreElement>(null)

  const source = useMemo(() => {
    if (!bodyHtml) return ""
    return bodyHtml.length > MAX_LENGTH && !showFull
      ? bodyHtml.slice(0, MAX_LENGTH)
      : bodyHtml
  }, [bodyHtml, showFull])

  const formattedHtml = useMemo(() => {
    if (!source) return ""
    return formatHtml(source)
  }, [source])

  const highlighted = useMemo(() => {
    if (!formattedHtml) return ""
    return highlightHtml(formattedHtml)
  }, [formattedHtml])

  const { annotated, lineMap } = useMemo(() => {
    if (!source) return { annotated: "", lineMap: new Map<number, number>() }
    return annotateHtml(formatHtml(source))
  }, [source])

  // Build reverse map: element idx → line number
  const idxToLine = useMemo(() => {
    const map = new Map<number, number>()
    for (const [line, idx] of lineMap) {
      map.set(idx, line)
    }
    return map
  }, [lineMap])

  const darkStyles = `<style>html{filter:invert(1) hue-rotate(180deg);background:#fff;}img,video,[style*="background-image"]{filter:invert(1) hue-rotate(180deg);}</style>`
  const iframeSrcDoc = darkMode ? darkStyles + annotated : annotated

  const highlightInIframe = useCallback((elementIdx: number | null) => {
    try {
      const doc = iframeRef.current?.contentDocument
      if (!doc) return
      // Clear previous highlight
      doc.querySelectorAll("[data-ce-highlight]").forEach((el) => {
        ;(el as HTMLElement).style.outline = ""
        el.removeAttribute("data-ce-highlight")
      })
      if (elementIdx === null) return
      const el = doc.querySelector(`[data-ce-idx="${elementIdx}"]`)
      if (el) {
        ;(el as HTMLElement).style.outline = "2px solid #facc15"
        el.setAttribute("data-ce-highlight", "true")
        el.scrollIntoView({ block: "nearest", behavior: "smooth" })
      }
    } catch {
      // cross-origin fallback
    }
  }, [])

  const handleCodeLineClick = useCallback((lineNum: number) => {
    setHighlightedLine(lineNum)
    const elementIdx = lineMap.get(lineNum)
    if (elementIdx !== undefined) {
      highlightInIframe(elementIdx)
    }
  }, [lineMap, highlightInIframe])

  // Setup iframe click listener
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    function handleIframeLoad() {
      try {
        const doc = iframe!.contentDocument
        if (!doc) return
        doc.addEventListener("click", (e) => {
          const target = e.target as HTMLElement
          const annotatedEl = target.closest("[data-ce-idx]")
          if (annotatedEl) {
            const idx = parseInt(annotatedEl.getAttribute("data-ce-idx") || "", 10)
            if (!isNaN(idx)) {
              const line = idxToLine.get(idx)
              if (line !== undefined) {
                setHighlightedLine(line)
                highlightInIframe(idx)
                // Scroll code pane to that line
                const lineEl = codeRef.current?.querySelector(`[data-line="${line}"]`)
                lineEl?.scrollIntoView({ block: "center", behavior: "smooth" })
              }
            }
          }
        })
      } catch {
        // cross-origin fallback
      }
    }

    iframe.addEventListener("load", handleIframeLoad)
    return () => iframe.removeEventListener("load", handleIframeLoad)
  }, [idxToLine, highlightInIframe])

  if (!bodyHtml) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        No HTML content available
      </div>
    )
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bodyHtml!)
      setCopied(true)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  const lines = highlighted.split("\n")

  return (
    <div className="flex h-full overflow-hidden">
      {/* Code pane (left) */}
      <div className="relative flex w-1/2 flex-col border-r">
        <div className="flex items-center gap-2 border-b bg-gray-50 px-3 py-1.5">
          <span className="text-xs font-medium text-gray-500">Source</span>
          <div className="flex-1" />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre
          ref={codeRef}
          className="flex-1 overflow-auto bg-gray-50 p-0 font-mono text-xs leading-relaxed"
        >
          <code>
            {lines.map((line, i) => {
              const lineNum = i + 1
              return (
                <div
                  key={i}
                  data-line={lineNum}
                  onClick={() => handleCodeLineClick(lineNum)}
                  className={cn(
                    "flex cursor-pointer hover:bg-yellow-50",
                    highlightedLine === lineNum && "bg-yellow-100"
                  )}
                >
                  <span className="inline-block w-10 shrink-0 select-none pr-2 text-right text-gray-400">
                    {lineNum}
                  </span>
                  <span
                    className="flex-1 whitespace-pre pr-4"
                    dangerouslySetInnerHTML={{ __html: line }}
                  />
                </div>
              )
            })}
          </code>
        </pre>
        {bodyHtml.length > MAX_LENGTH && !showFull && (
          <div className="border-t bg-gray-50 px-4 py-2 text-center">
            <button
              onClick={() => setShowFull(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              Show full source ({Math.round(bodyHtml.length / 1000)}KB)
            </button>
          </div>
        )}
      </div>

      {/* Preview pane (right) */}
      <div className="flex w-1/2 flex-col">
        <div className="flex items-center gap-2 border-b bg-gray-50 px-3 py-1.5">
          <span className="text-xs font-medium text-gray-500">Preview</span>
          <div className="flex-1" />
          <button
            onClick={() => setDarkMode((d) => !d)}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              darkMode
                ? "bg-gray-800 text-yellow-300"
                : "text-gray-600 hover:bg-gray-100"
            )}
            title={darkMode ? "Light mode" : "Dark mode"}
          >
            {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <iframe
            key={darkMode ? "dark" : "light"}
            ref={iframeRef}
            srcDoc={iframeSrcDoc}
            sandbox="allow-same-origin"
            className="h-full w-full border-0"
            title="Email preview"
            style={{ minHeight: 400 }}
          />
        </div>
      </div>
    </div>
  )
}
