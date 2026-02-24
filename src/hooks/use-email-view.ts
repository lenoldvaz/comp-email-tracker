"use client"

import { useState, useEffect } from "react"
import type { EmailViewMode, ExtractedLink, ExtractedImage } from "@/types/email"
import { extractLinks, extractImages } from "@/lib/utils/html-extract"

export function useEmailView(emailId: string, bodyHtml: string | null) {
  const [activeView, setActiveView] = useState<EmailViewMode>("desktop")
  const [darkMode, setDarkMode] = useState(false)
  const [previewWidth, setPreviewWidth] = useState<number | "full">("full")
  const [links, setLinks] = useState<ExtractedLink[]>([])
  const [images, setImages] = useState<ExtractedImage[]>([])
  const [linksLoading, setLinksLoading] = useState(false)

  useEffect(() => {
    if (bodyHtml) {
      setLinks(extractLinks(bodyHtml))
      setImages(extractImages(bodyHtml))
    } else {
      setLinks([])
      setImages([])
    }
  }, [bodyHtml])

  async function validateLinks() {
    const urls = links.map((l) => l.href).filter((h) => h.startsWith("http"))
    if (urls.length === 0) return

    setLinksLoading(true)
    try {
      const res = await fetch(`/api/emails/${emailId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      })
      const data = await res.json()
      if (data.results) {
        setLinks((prev) =>
          prev.map((link) => {
            const result = data.results.find(
              (r: { url: string }) => r.url === link.href
            )
            return result
              ? { ...link, status: result.status, error: result.error }
              : link
          })
        )
      }
    } catch {
      // silently fail
    } finally {
      setLinksLoading(false)
    }
  }

  return {
    activeView,
    setActiveView,
    darkMode,
    toggleDarkMode: () => setDarkMode((d) => !d),
    previewWidth,
    setPreviewWidth,
    links,
    images,
    linksLoading,
    validateLinks,
  }
}
