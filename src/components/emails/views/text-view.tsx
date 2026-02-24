"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { toast } from "sonner"

interface TextViewProps {
  bodyText: string | null
}

export function TextView({ bodyText }: TextViewProps) {
  const [copied, setCopied] = useState(false)

  if (!bodyText) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        No plain text version available for this email
      </div>
    )
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bodyText!)
      setCopied(true)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="absolute right-4 top-4 flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="whitespace-pre-wrap p-4 font-mono text-sm leading-relaxed text-gray-700">
        {bodyText}
      </pre>
    </div>
  )
}
