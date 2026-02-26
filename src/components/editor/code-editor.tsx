"use client"

import { useEffect, useRef, useCallback } from "react"
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import { html } from "@codemirror/lang-html"
import { defaultKeymap, history, historyKeymap, undo, redo } from "@codemirror/commands"
import { bracketMatching, foldGutter, foldKeymap } from "@codemirror/language"
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search"
import { autocompletion, completionKeymap } from "@codemirror/autocomplete"

const lightTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px" },
  ".cm-scroller": { overflow: "auto", fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace" },
  ".cm-gutters": { backgroundColor: "#f8fafc", borderRight: "1px solid #e2e8f0" },
  ".cm-activeLineGutter": { backgroundColor: "#e2e8f0" },
  ".cm-activeLine": { backgroundColor: "#f1f5f9" },
  ".cm-selectionMatch": { backgroundColor: "#dbeafe" },
  "&.cm-focused .cm-cursor": { borderLeftColor: "#3b82f6" },
})

const darkTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px", backgroundColor: "#1e293b" },
  ".cm-scroller": { overflow: "auto", fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace" },
  ".cm-gutters": { backgroundColor: "#0f172a", borderRight: "1px solid #334155", color: "#64748b" },
  ".cm-activeLineGutter": { backgroundColor: "#1e293b" },
  ".cm-activeLine": { backgroundColor: "#334155" },
  ".cm-content": { color: "#e2e8f0", caretColor: "#60a5fa" },
  ".cm-selectionMatch": { backgroundColor: "#1e3a5f" },
  "&.cm-focused .cm-cursor": { borderLeftColor: "#60a5fa" },
}, { dark: true })

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  darkMode?: boolean
  className?: string
}

export function CodeEditor({ value, onChange, darkMode = false, className }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Expose undo/redo via imperative handle
  const handleUndo = useCallback(() => {
    if (viewRef.current) undo(viewRef.current)
  }, [])

  const handleRedo = useCallback(() => {
    if (viewRef.current) redo(viewRef.current)
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        drawSelection(),
        bracketMatching(),
        foldGutter(),
        highlightSelectionMatches(),
        history(),
        autocompletion(),
        html(),
        darkMode ? darkTheme : lightTheme,
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...searchKeymap,
          ...completionKeymap,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString())
          }
        }),
      ],
    })

    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  // We intentionally only create the editor once or when darkMode changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [darkMode])

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const currentDoc = view.state.doc.toString()
    if (currentDoc !== value) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      })
    }
  }, [value])

  return (
    <div
      ref={containerRef}
      className={className}
    />
  )
}

