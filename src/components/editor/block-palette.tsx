"use client"

import {
  Type,
  Image,
  MousePointerClick,
  Columns2,
  Minus,
  ArrowUpDown,
  PanelTop,
  PanelBottom,
} from "lucide-react"
import type { BlockType } from "@/types/draft"

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: "text", label: "Text", icon: <Type className="h-4 w-4" /> },
  { type: "image", label: "Image", icon: <Image className="h-4 w-4" /> },
  { type: "button", label: "Button", icon: <MousePointerClick className="h-4 w-4" /> },
  { type: "columns", label: "Columns", icon: <Columns2 className="h-4 w-4" /> },
  { type: "divider", label: "Divider", icon: <Minus className="h-4 w-4" /> },
  { type: "spacer", label: "Spacer", icon: <ArrowUpDown className="h-4 w-4" /> },
  { type: "header", label: "Header", icon: <PanelTop className="h-4 w-4" /> },
  { type: "footer", label: "Footer", icon: <PanelBottom className="h-4 w-4" /> },
]

interface BlockPaletteProps {
  className?: string
}

export function BlockPalette({ className }: BlockPaletteProps) {
  function handleDragStart(e: React.DragEvent, type: BlockType) {
    e.dataTransfer.setData("block-type", type)
    e.dataTransfer.effectAllowed = "copy"
  }

  return (
    <div className={className}>
      <h3 className="mb-2 px-3 pt-3 text-xs font-semibold uppercase text-gray-500">Blocks</h3>
      <div className="grid grid-cols-2 gap-1.5 px-3 pb-3">
        {BLOCK_TYPES.map(({ type, label, icon }) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => handleDragStart(e, type)}
            className="flex cursor-grab items-center gap-2 rounded-md border bg-white px-2.5 py-2 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:cursor-grabbing"
          >
            {icon}
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
