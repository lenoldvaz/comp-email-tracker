"use client"

import { Moon, Sun, Smartphone, Tablet, Monitor, Maximize2, Minimize2 } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import type { EmailViewMode } from "@/types/email"
import { WIDTH_PRESETS } from "@/types/email"

interface EmailViewToolbarProps {
  activeView: EmailViewMode
  darkMode: boolean
  onDarkModeToggle: () => void
  previewWidth: number | "full"
  onWidthChange: (width: number | "full") => void
  focusMode?: boolean
  onFocusToggle?: () => void
}

const presetIcons: Record<string, React.ElementType> = {
  Phone: Smartphone,
  "Phone L": Smartphone,
  Tablet: Tablet,
  Desktop: Monitor,
  Full: Maximize2,
}

export function EmailViewToolbar({
  activeView,
  darkMode,
  onDarkModeToggle,
  previewWidth,
  onWidthChange,
  focusMode,
  onFocusToggle,
}: EmailViewToolbarProps) {
  const showWidthControls = activeView === "desktop"
  const showDarkMode = activeView === "desktop" || activeView === "mobile"

  return (
    <div className="flex items-center gap-1">
      {showDarkMode && (
        <button
          onClick={onDarkModeToggle}
          className={cn(
            "rounded-md p-1.5 transition-colors",
            darkMode
              ? "bg-gray-800 text-yellow-300"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          )}
          title={darkMode ? "Light mode" : "Dark mode"}
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      )}

      {showWidthControls && (
        <>
          <div className="mx-1 h-4 w-px bg-gray-300" />
          {WIDTH_PRESETS.map((preset) => {
            const Icon = presetIcons[preset.label] || Monitor
            const active = previewWidth === preset.width
            return (
              <button
                key={preset.label}
                onClick={() => onWidthChange(preset.width)}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  active
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                )}
                title={
                  preset.width === "full"
                    ? "Full width"
                    : `${preset.label} (${preset.width}px)`
                }
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            )
          })}
          {typeof previewWidth === "number" && (
            <span className="ml-1 text-xs text-gray-400">{previewWidth}px</span>
          )}
        </>
      )}

      {onFocusToggle && (
        <>
          <div className="mx-1 h-4 w-px bg-gray-300" />
          <button
            onClick={onFocusToggle}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              focusMode
                ? "bg-blue-100 text-blue-700"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            )}
            title={focusMode ? "Exit focus mode" : "Focus mode"}
          >
            {focusMode ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </>
      )}
    </div>
  )
}
