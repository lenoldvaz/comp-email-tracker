"use client"

import { useState, useEffect } from "react"
import { X, LayoutTemplate } from "lucide-react"
import { useOrg } from "@/app/(dashboard)/org-context"
import type { EmailDraft } from "@/types/draft"

interface TemplatePickerProps {
  onSelect: (template: EmailDraft) => void
  onClose: () => void
}

export function TemplatePicker({ onSelect, onClose }: TemplatePickerProps) {
  const { orgId } = useOrg()
  const [templates, setTemplates] = useState<EmailDraft[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTemplates() {
      const res = await fetch(`/api/templates?orgId=${orgId}`)
      if (res.ok) setTemplates(await res.json())
      setLoading(false)
    }
    fetchTemplates()
  }, [orgId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Choose a Template</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-500">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No templates yet. Save a draft as a template to see it here.
          </div>
        ) : (
          <div className="grid max-h-96 gap-2 overflow-auto">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelect(template)}
                className="flex items-center gap-3 rounded-md border p-4 text-left transition-colors hover:bg-gray-50"
              >
                <LayoutTemplate className="h-6 w-6 flex-shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {template.templateName || template.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {template.subject || "No subject"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
