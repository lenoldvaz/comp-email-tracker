"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import { toast } from "sonner"
import dynamic from "next/dynamic"
import { EditorToolbar, type EditorTab } from "@/components/editor/editor-toolbar"
import { LivePreview } from "@/components/editor/live-preview"
import { HtmlChecker } from "@/components/editor/html-checker"
import { TransformerPanel } from "@/components/editor/transformer-panel"
import { TestSendDialog } from "@/components/editor/test-send-dialog"
import { ValidationPanel } from "@/components/editor/validation-panel"
import { ExportMenu } from "@/components/editor/export-menu"
import type { EmailDraft } from "@/types/draft"

const CodeEditor = dynamic(
  () => import("@/components/editor/code-editor").then((m) => ({ default: m.CodeEditor })),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-gray-400">Loading editor...</div> }
)

const VisualEditor = dynamic(
  () => import("@/components/editor/visual-editor").then((m) => ({ default: m.VisualEditor })),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-gray-400">Loading visual editor...</div> }
)

export default function DraftEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [draft, setDraft] = useState<EmailDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<EditorTab>("code")
  const [htmlContent, setHtmlContent] = useState("")
  const [title, setTitle] = useState("")
  const [subject, setSubject] = useState("")
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved")
  const [showTestSend, setShowTestSend] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedRef = useRef("")

  useEffect(() => {
    fetchDraft()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchDraft() {
    setLoading(true)
    const res = await fetch(`/api/drafts/${id}`)
    if (res.ok) {
      const data: EmailDraft = await res.json()
      setDraft(data)
      setTitle(data.title)
      setSubject(data.subject)
      setHtmlContent(data.htmlContent)
      lastSavedRef.current = data.htmlContent
    } else {
      toast.error("Draft not found")
      router.push("/drafts")
    }
    setLoading(false)
  }

  const saveDraft = useCallback(async (fields: Record<string, unknown>) => {
    setSaveStatus("saving")
    const res = await fetch(`/api/drafts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    })
    if (res.ok) {
      const data = await res.json()
      setDraft(data)
      lastSavedRef.current = data.htmlContent
      setSaveStatus("saved")
    } else {
      setSaveStatus("unsaved")
      toast.error("Failed to save")
    }
  }, [id])

  // Auto-save on content change (debounced 2s)
  const scheduleAutoSave = useCallback((newHtml: string, newTitle: string, newSubject: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    setSaveStatus("unsaved")
    saveTimeoutRef.current = setTimeout(() => {
      const updates: Record<string, unknown> = {}
      if (newHtml !== lastSavedRef.current) updates.htmlContent = newHtml
      if (newTitle !== draft?.title) updates.title = newTitle
      if (newSubject !== draft?.subject) updates.subject = newSubject
      if (Object.keys(updates).length > 0) saveDraft(updates)
    }, 2000)
  }, [draft, saveDraft])

  function handleHtmlChange(newHtml: string) {
    setHtmlContent(newHtml)
    scheduleAutoSave(newHtml, title, subject)
  }

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle)
    scheduleAutoSave(htmlContent, newTitle, subject)
  }

  function handleSubjectChange(newSubject: string) {
    setSubject(newSubject)
    scheduleAutoSave(htmlContent, title, newSubject)
  }

  function handleFormat() {
    // Basic HTML formatting
    let formatted = htmlContent
    let indent = 0
    const lines = formatted.replace(/>\s*</g, ">\n<").split("\n")
    const result: string[] = []
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      if (trimmed.startsWith("</")) indent = Math.max(0, indent - 1)
      result.push("  ".repeat(indent) + trimmed)
      if (trimmed.startsWith("<") && !trimmed.startsWith("</") && !trimmed.startsWith("<!") && !trimmed.endsWith("/>") && !/<\/[^>]+>$/.test(trimmed)) {
        indent++
      }
    }
    const newHtml = result.join("\n")
    setHtmlContent(newHtml)
    scheduleAutoSave(newHtml, title, subject)
  }

  function handleManualSave() {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveDraft({ htmlContent, title, subject })
  }

  // Cmd+S handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        handleManualSave()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [htmlContent, title, subject])

  function handleSaveAsTemplate() {
    saveDraft({ isTemplate: true, templateName: title })
    toast.success("Saved as template")
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center text-sm text-gray-500">Loading draft...</div>
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-white px-4 py-2">
        <button onClick={() => router.push("/drafts")} className="rounded p-1 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-gray-900 focus:outline-none"
            placeholder="Draft title"
          />
          <div className="mx-2 h-4 w-px bg-gray-200" />
          <input
            type="text"
            value={subject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-gray-600 focus:outline-none"
            placeholder="Subject line"
          />
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu draftId={id} />
          <button
            onClick={() => setShowTestSend(true)}
            className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Test Send
          </button>
          <button
            onClick={handleSaveAsTemplate}
            className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Save as Template
          </button>
          <button
            onClick={handleManualSave}
            className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Save className="h-3 w-3" />
            Save
          </button>
        </div>
      </div>

      {/* Editor toolbar */}
      <EditorToolbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onFormat={handleFormat}
        saveStatus={saveStatus}
      />

      {/* Main editor area */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {activeTab === "code" && (
            <div className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col">
                <CodeEditor
                  value={htmlContent}
                  onChange={handleHtmlChange}
                  className="min-h-0 flex-1"
                />
                <HtmlChecker html={htmlContent} />
              </div>
              <div className="w-px bg-gray-200" />
              <div className="flex min-w-0 flex-1 flex-col">
                <LivePreview html={htmlContent} className="min-h-0 flex-1" />
              </div>
            </div>
          )}

          {activeTab === "visual" && (
            <VisualEditor
              html={htmlContent}
              onChange={handleHtmlChange}
              className="min-h-0 flex-1"
            />
          )}

          {activeTab === "preview" && (
            <LivePreview html={htmlContent} className="min-h-0 flex-1" />
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-72 flex-shrink-0 overflow-auto border-l bg-gray-50">
          <TransformerPanel draftId={id} onTransformed={setHtmlContent} />
          <ValidationPanel draftId={id} />
        </div>
      </div>

      {/* Test Send Modal */}
      {showTestSend && (
        <TestSendDialog draftId={id} subject={subject} onClose={() => setShowTestSend(false)} />
      )}
    </div>
  )
}
