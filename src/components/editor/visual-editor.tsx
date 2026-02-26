"use client"

import { useState, useCallback, useEffect } from "react"
import { BlockPalette } from "./block-palette"
import { BlockCanvas } from "./block-canvas"
import { BlockProperties } from "./block-properties"
import { blocksToHtml, htmlToBlocks, createDefaultBlock } from "@/lib/utils/block-serializer"
import type { DraftBlock, BlockType } from "@/types/draft"
import { cn } from "@/lib/utils/cn"

interface VisualEditorProps {
  html: string
  onChange: (html: string) => void
  className?: string
}

export function VisualEditor({ html, onChange, className }: VisualEditorProps) {
  const [blocks, setBlocks] = useState<DraftBlock[]>([])
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Parse HTML into blocks on initial load
  useEffect(() => {
    if (!initialized) {
      const parsed = htmlToBlocks(html)
      setBlocks(parsed)
      setInitialized(true)
    }
  }, [html, initialized])

  const syncToHtml = useCallback((newBlocks: DraftBlock[]) => {
    setBlocks(newBlocks)
    onChange(blocksToHtml(newBlocks))
  }, [onChange])

  const handleAddBlock = useCallback((type: BlockType, index: number) => {
    const newBlock = createDefaultBlock(type)
    const newBlocks = [...blocks]
    newBlocks.splice(index, 0, newBlock)
    syncToHtml(newBlocks)
    setSelectedBlockId(newBlock.id)
  }, [blocks, syncToHtml])

  const handleDeleteBlock = useCallback((id: string) => {
    const newBlocks = blocks.filter((b) => b.id !== id)
    syncToHtml(newBlocks)
    if (selectedBlockId === id) setSelectedBlockId(null)
  }, [blocks, selectedBlockId, syncToHtml])

  const handleReorderBlocks = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    const newBlocks = [...blocks]
    const [moved] = newBlocks.splice(fromIndex, 1)
    const adjustedTo = fromIndex < toIndex ? toIndex - 1 : toIndex
    newBlocks.splice(adjustedTo, 0, moved)
    syncToHtml(newBlocks)
  }, [blocks, syncToHtml])

  const handleUpdateBlock = useCallback((id: string, properties: DraftBlock["properties"]) => {
    const newBlocks = blocks.map((b) => b.id === id ? { ...b, properties } : b)
    syncToHtml(newBlocks)
  }, [blocks, syncToHtml])

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null

  return (
    <div className={cn("flex", className)}>
      {/* Left: Block palette */}
      <div className="w-48 flex-shrink-0 overflow-auto border-r bg-gray-50">
        <BlockPalette />
      </div>

      {/* Center: Canvas */}
      <BlockCanvas
        blocks={blocks}
        selectedBlockId={selectedBlockId}
        onSelectBlock={setSelectedBlockId}
        onAddBlock={handleAddBlock}
        onDeleteBlock={handleDeleteBlock}
        onReorderBlocks={handleReorderBlocks}
        className="min-w-0 flex-1"
      />

      {/* Right: Properties */}
      <div className="w-64 flex-shrink-0 overflow-auto border-l bg-white">
        {selectedBlock ? (
          <BlockProperties
            block={selectedBlock}
            onChange={handleUpdateBlock}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-xs text-gray-400">
            Select a block to edit its properties
          </div>
        )}
      </div>
    </div>
  )
}
