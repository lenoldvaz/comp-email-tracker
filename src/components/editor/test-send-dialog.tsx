"use client"

import { useState } from "react"
import { X, Send, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface TestSendDialogProps {
  draftId: string
  subject: string
  onClose: () => void
}

export function TestSendDialog({ draftId, subject, onClose }: TestSendDialogProps) {
  const [emails, setEmails] = useState([""])
  const [customSubject, setCustomSubject] = useState(subject)
  const [sending, setSending] = useState(false)

  function addEmail() {
    setEmails([...emails, ""])
  }

  function removeEmail(index: number) {
    setEmails(emails.filter((_, i) => i !== index))
  }

  function updateEmail(index: number, value: string) {
    const updated = [...emails]
    updated[index] = value
    setEmails(updated)
  }

  async function handleSend() {
    const validEmails = emails.filter((e) => e.trim())
    if (validEmails.length === 0) {
      toast.error("Enter at least one email address")
      return
    }

    setSending(true)
    try {
      const res = await fetch(`/api/drafts/${draftId}/test-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: validEmails, subject: customSubject }),
      })
      const data = await res.json()

      if (res.ok) {
        toast.success(`Test email sent to ${data.sentTo.join(", ")}`)
        onClose()
      } else {
        toast.error(data.error || "Failed to send test email")
      }
    } catch {
      toast.error("Failed to send test email")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Send Test Email</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Subject line"
            />
            <p className="mt-1 text-xs text-gray-400">Will be prefixed with [TEST]</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Recipients</label>
            <div className="mt-1 space-y-2">
              {emails.map((email, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmail(i, e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="email@example.com"
                  />
                  {emails.length > 1 && (
                    <button onClick={() => removeEmail(i)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {emails.length < 10 && (
              <button
                onClick={addEmail}
                className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-3 w-3" />
                Add recipient
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {sending ? "Sending..." : "Send Test"}
          </button>
        </div>
      </div>
    </div>
  )
}
