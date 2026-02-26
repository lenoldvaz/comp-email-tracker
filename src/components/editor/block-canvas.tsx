"use client"

import { useState, useCallback } from "react"
import { GripVertical, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import type { DraftBlock, BlockType, TextBlockProps, ImageBlockProps, ButtonBlockProps, HeaderBlockProps, FooterBlockProps, DividerBlockProps, SpacerBlockProps } from "@/types/draft"

interface BlockCanvasProps {
  blocks: DraftBlock[]
  selectedBlockId: string | null
  onSelectBlock: (id: string | null) => void
  onAddBlock: (type: BlockType, index: number) => void
  onDeleteBlock: (id: string) => void
  onReorderBlocks: (fromIndex: number, toIndex: number) => void
  className?: string
}

export function BlockCanvas({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onAddBlock,
  onDeleteBlock,
  onReorderBlocks,
  className,
}: BlockCanvasProps) {
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
    setDropIndex(index)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDropIndex(null)

    const blockType = e.dataTransfer.getData("block-type") as BlockType
    if (blockType) {
      onAddBlock(blockType, index)
      return
    }

    const reorderFrom = e.dataTransfer.getData("reorder-from")
    if (reorderFrom) {
      onReorderBlocks(parseInt(reorderFrom), index)
    }
  }, [onAddBlock, onReorderBlocks])

  const handleBlockDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("reorder-from", String(index))
    e.dataTransfer.effectAllowed = "move"
    setDragIndex(index)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setDropIndex(null)
  }, [])

  function renderBlockPreview(block: DraftBlock) {
    switch (block.type) {
      case "text": {
        const p = block.properties as TextBlockProps
        return <div className="px-2 py-1 text-sm" dangerouslySetInnerHTML={{ __html: p.content }} />
      }
      case "image": {
        const p = block.properties as ImageBlockProps
        return p.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.src} alt={p.alt} className="mx-auto max-h-32 object-contain" />
        ) : (
          <div className="flex h-20 items-center justify-center bg-gray-100 text-xs text-gray-400">No image set</div>
        )
      }
      case "button": {
        const p = block.properties as ButtonBlockProps
        return (
          <div className={cn("py-2", `text-${p.alignment}`)}>
            <span
              className="inline-block rounded px-4 py-2 text-sm font-medium"
              style={{ backgroundColor: p.backgroundColor, color: p.textColor, borderRadius: p.borderRadius }}
            >
              {p.text}
            </span>
          </div>
        )
      }
      case "columns":
        return <div className="py-2 text-center text-xs text-gray-400">Columns layout</div>
      case "divider": {
        const p = block.properties as DividerBlockProps
        return <hr style={{ borderColor: p.color, borderTopWidth: p.thickness }} />
      }
      case "spacer": {
        const p = block.properties as SpacerBlockProps
        return <div style={{ height: p.height }} className="bg-gray-50" />
      }
      case "header": {
        const p = block.properties as HeaderBlockProps
        return <div className="p-2 text-center text-sm" style={{ backgroundColor: p.backgroundColor }} dangerouslySetInnerHTML={{ __html: p.content }} />
      }
      case "footer": {
        const p = block.properties as FooterBlockProps
        return <div className="p-2 text-center text-xs" style={{ backgroundColor: p.backgroundColor, color: p.color }} dangerouslySetInnerHTML={{ __html: p.content }} />
      }
    }
  }

  return (
    <div className={cn("overflow-auto bg-gray-100 p-6", className)}>
      <div className="mx-auto max-w-[600px] bg-white shadow-sm">
        {/* Drop zone at top */}
        <div
          className={cn("h-2 transition-all", dropIndex === 0 && "h-6 bg-blue-100 border-2 border-dashed border-blue-400")}
          onDragOver={(e) => handleDragOver(e, 0)}
          onDrop={(e) => handleDrop(e, 0)}
          onDragLeave={() => setDropIndex(null)}
        />

        {blocks.length === 0 && (
          <div
            className="flex h-40 items-center justify-center border-2 border-dashed border-gray-300 text-sm text-gray-400"
            onDragOver={(e) => handleDragOver(e, 0)}
            onDrop={(e) => handleDrop(e, 0)}
            onDragLeave={() => setDropIndex(null)}
          >
            Drag blocks here to start building
          </div>
        )}

        {blocks.map((block, index) => (
          <div key={block.id}>
            <div
              className={cn(
                "group relative border-2 border-transparent transition-colors",
                selectedBlockId === block.id && "border-blue-500",
                selectedBlockId !== block.id && "hover:border-blue-200",
                dragIndex === index && "opacity-50"
              )}
              onClick={() => onSelectBlock(block.id)}
              draggable
              onDragStart={(e) => handleBlockDragStart(e, index)}
              onDragEnd={handleDragEnd}
            >
              {/* Drag handle + delete */}
              <div className="absolute -left-8 top-1/2 flex -translate-y-1/2 flex-col gap-0.5 opacity-0 group-hover:opacity-100">
                <button className="cursor-grab rounded p-0.5 text-gray-400 hover:bg-gray-200 active:cursor-grabbing">
                  <GripVertical className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                className="absolute -right-7 top-0 rounded p-0.5 text-gray-300 opacity-0 hover:text-red-500 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); onDeleteBlock(block.id) }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              {renderBlockPreview(block)}
            </div>

            {/* Drop zone between blocks */}
            <div
              className={cn(
                "h-2 transition-all",
                dropIndex === index + 1 && "h-6 bg-blue-100 border-2 border-dashed border-blue-400"
              )}
              onDragOver={(e) => handleDragOver(e, index + 1)}
              onDrop={(e) => handleDrop(e, index + 1)}
              onDragLeave={() => setDropIndex(null)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
