"use client"

import { useRef, useEffect } from "react"

interface MobileViewProps {
  bodyHtml: string | null
  bodyText: string | null
  darkMode: boolean
}

const DARK_STYLES = `<style>html{filter:invert(1) hue-rotate(180deg);background:#fff;}img,video,[style*="background-image"]{filter:invert(1) hue-rotate(180deg);}</style>`

export function MobileView({ bodyHtml, bodyText, darkMode }: MobileViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const handleLoad = () => {
      try {
        const height = iframe.contentDocument?.body?.scrollHeight
        if (height) iframe.style.height = `${Math.max(height + 20, 667)}px`
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

  const content = bodyHtml
    ? darkMode
      ? DARK_STYLES + bodyHtml
      : bodyHtml
    : `<pre style="white-space:pre-wrap;font-family:system-ui;padding:16px;font-size:14px;color:#374151;">${bodyText}</pre>`

  return (
    <div className="flex justify-center py-6">
      {/* Phone frame */}
      <div className="rounded-[2.5rem] border-[8px] border-gray-800 bg-gray-800 shadow-xl">
        {/* Notch */}
        <div className="mx-auto h-5 w-28 rounded-b-xl bg-gray-900" />
        {/* Screen */}
        <div className="overflow-hidden rounded-[2rem] bg-white">
          <iframe
            key={darkMode ? "dark" : "light"}
            ref={iframeRef}
            srcDoc={content}
            sandbox="allow-same-origin"
            className="border-0"
            title="Email content (mobile)"
            style={{ width: 375, minHeight: 667 }}
          />
        </div>
        {/* Home indicator */}
        <div className="mx-auto my-2 h-1 w-24 rounded-full bg-gray-600" />
      </div>
    </div>
  )
}
