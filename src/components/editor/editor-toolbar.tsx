"use client"

import { Code, Eye, LayoutTemplate, Undo2, Redo2 } from "lucide-react"
import { cn } from "@/lib/utils/cn"

export type EditorTab = "code" | "visual" | "preview"

interface EditorToolbarProps {
  activeTab: EditorTab
  onTabChange: (tab: EditorTab) => void
  onFormat?: () => void
  onUndo?: () => void
  onRedo?: () => void
  saveStatus?: "saved" | "saving" | "unsaved"
}

export function EditorToolbar({
  activeTab,
  onTabChange,
  onFormat,
  onUndo,
  onRedo,
  saveStatus,
}: EditorToolbarProps) {
  const tabs: { id: EditorTab; label: string; icon: React.ReactNode }[] = [
    { id: "code", label: "Code", icon: <Code className="h-3.5 w-3.5" /> },
    { id: "visual", label: "Visual", icon: <LayoutTemplate className="h-3.5 w-3.5" /> },
    { id: "preview", label: "Preview", icon: <Eye className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="flex items-center justify-between border-b bg-white px-3 py-1.5">
      <div className="flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors",
              activeTab === tab.id
                ? "bg-blue-50 text-blue-700"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {activeTab === "code" && (
          <>
            <button
              onClick={onUndo}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Undo"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onRedo}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Redo"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
            <div className="mx-1 h-4 w-px bg-gray-300" />
            <button
              onClick={onFormat}
              className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              Format
            </button>
          </>
        )}

        {saveStatus && (
          <span className={cn(
            "text-xs",
            saveStatus === "saved" && "text-green-600",
            saveStatus === "saving" && "text-yellow-600",
            saveStatus === "unsaved" && "text-gray-400",
          )}>
            {saveStatus === "saved" && "Saved"}
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "unsaved" && "Unsaved"}
          </span>
        )}
      </div>
    </div>
  )
}
