"use client"

import { useState, useRef, useEffect } from "react"
import { Download, Copy, FileArchive, FileText, ChevronDown } from "lucide-react"
import { toast } from "sonner"

interface ExportMenuProps {
  draftId: string
}

export function ExportMenu({ draftId }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  async function handleCopyHtml() {
    try {
      const res = await fetch(`/api/drafts/${draftId}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      await navigator.clipboard.writeText(data.htmlContent)
      toast.success("HTML copied to clipboard")
    } catch {
      toast.error("Failed to copy HTML")
    }
    setOpen(false)
  }

  function handleDownloadHtml() {
    window.open(`/api/drafts/${draftId}/export?format=html`, "_blank")
    setOpen(false)
  }

  function handleDownloadZip() {
    window.open(`/api/drafts/${draftId}/export?format=zip`, "_blank")
    setOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        <Download className="h-3 w-3" />
        Export
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border bg-white py-1 shadow-lg">
          <button
            onClick={handleCopyHtml}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
          >
            <Copy className="h-3.5 w-3.5 text-gray-400" />
            Copy HTML
          </button>
          <button
            onClick={handleDownloadHtml}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
          >
            <FileText className="h-3.5 w-3.5 text-gray-400" />
            Download HTML
          </button>
          <button
            onClick={handleDownloadZip}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
          >
            <FileArchive className="h-3.5 w-3.5 text-gray-400" />
            Download ZIP
          </button>
        </div>
      )}
    </div>
  )
}
