"use client"

import { useRef, useEffect, useState } from "react"
import { Monitor, Smartphone, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface LivePreviewProps {
  html: string
  className?: string
}

export function LivePreview({ html, className }: LivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")
  const [darkMode, setDarkMode] = useState(false)
  const [iframeHeight, setIframeHeight] = useState(600)

  const darkModeStyle = darkMode
    ? `<style>html { filter: invert(1) hue-rotate(180deg); } img, video { filter: invert(1) hue-rotate(180deg); }</style>`
    : ""

  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${darkModeStyle}</head><body style="margin:0;padding:0;">${html || '<p style="padding:40px;color:#94a3b8;text-align:center;font-family:sans-serif;">Start typing HTML to see a preview...</p>'}</body></html>`

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const handleLoad = () => {
      try {
        const height = iframe.contentDocument?.body?.scrollHeight
        if (height) setIframeHeight(Math.max(height + 20, 200))
      } catch {
        // cross-origin, ignore
      }
    }
    iframe.addEventListener("load", handleLoad)
    return () => iframe.removeEventListener("load", handleLoad)
  }, [srcDoc])

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-2 border-b bg-gray-50 px-3 py-2">
        <span className="text-xs font-medium text-gray-500">Preview</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setPreviewMode("desktop")}
            className={cn(
              "rounded p-1.5 transition-colors",
              previewMode === "desktop" ? "bg-blue-100 text-blue-700" : "text-gray-400 hover:text-gray-600"
            )}
            title="Desktop view"
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setPreviewMode("mobile")}
            className={cn(
              "rounded p-1.5 transition-colors",
              previewMode === "mobile" ? "bg-blue-100 text-blue-700" : "text-gray-400 hover:text-gray-600"
            )}
            title="Mobile view (375px)"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
          <div className="mx-1 h-4 w-px bg-gray-300" />
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={cn(
              "rounded p-1.5 transition-colors",
              darkMode ? "bg-gray-700 text-yellow-400" : "text-gray-400 hover:text-gray-600"
            )}
            title="Toggle dark mode"
          >
            {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      <div className={cn(
        "flex-1 overflow-auto bg-gray-100 p-4",
        darkMode && "bg-gray-900"
      )}>
        <div
          className={cn(
            "mx-auto bg-white shadow-sm transition-all",
            darkMode && "bg-gray-800",
            previewMode === "mobile" ? "w-[375px]" : "w-full"
          )}
        >
          <iframe
            ref={iframeRef}
            srcDoc={srcDoc}
            title="Email Preview"
            className="w-full border-0"
            style={{ height: iframeHeight }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  )
}
