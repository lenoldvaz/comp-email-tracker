"use client"

import { useRef, useEffect } from "react"

interface DesktopViewProps {
  bodyHtml: string | null
  bodyText: string | null
  darkMode: boolean
  previewWidth: number | "full"
}

const DARK_STYLES = `<style>html{filter:invert(1) hue-rotate(180deg);background:#fff;}img,video,[style*="background-image"]{filter:invert(1) hue-rotate(180deg);}</style>`

export function DesktopView({
  bodyHtml,
  bodyText,
  darkMode,
  previewWidth,
}: DesktopViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const handleLoad = () => {
      try {
        const height = iframe.contentDocument?.body?.scrollHeight
        if (height) iframe.style.height = `${height + 20}px`
      } catch {
        // cross-origin fallback
      }
    }
    iframe.addEventListener("load", handleLoad)
    return () => iframe.removeEventListener("load", handleLoad)
  }, [bodyHtml, darkMode])

  if (!bodyHtml && !bodyText) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        No content available
      </div>
    )
  }

  if (!bodyHtml) {
    return (
      <pre className="whitespace-pre-wrap p-4 text-sm text-gray-700">
        {bodyText}
      </pre>
    )
  }

  const srcDoc = darkMode ? DARK_STYLES + bodyHtml : bodyHtml

  return (
    <div className="flex justify-center p-4">
      <div
        className="w-full transition-all"
        style={{
          maxWidth: previewWidth === "full" ? "100%" : `${previewWidth}px`,
        }}
      >
        <iframe
          key={darkMode ? "dark" : "light"}
          ref={iframeRef}
          srcDoc={srcDoc}
          sandbox="allow-same-origin"
          className="w-full border-0"
          title="Email content"
          style={{ minHeight: 400 }}
        />
      </div>
    </div>
  )
}
