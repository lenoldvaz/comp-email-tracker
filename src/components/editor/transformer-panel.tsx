"use client"

import { useState } from "react"
import { Wand2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { toast } from "sonner"

interface TransformerPanelProps {
  draftId: string
  onTransformed: (html: string) => void
}

export function TransformerPanel({ draftId, onTransformed }: TransformerPanelProps) {
  const [inlineCss, setInlineCss] = useState(false)
  const [minifyHtml, setMinifyHtml] = useState(false)
  const [cleanCss, setCleanCss] = useState(false)
  const [addUtm, setAddUtm] = useState(false)
  const [utmSource, setUtmSource] = useState("email")
  const [utmMedium, setUtmMedium] = useState("email")
  const [utmCampaign, setUtmCampaign] = useState("")
  const [applying, setApplying] = useState(false)
  const [lastResult, setLastResult] = useState<{ originalSize: number; transformedSize: number } | null>(null)

  async function applyTransforms() {
    if (!inlineCss && !minifyHtml && !cleanCss && !addUtm) {
      toast.error("Select at least one transform")
      return
    }

    setApplying(true)
    try {
      const body: Record<string, unknown> = {
        inlineCss,
        minify: minifyHtml,
        cleanCss,
      }
      if (addUtm && utmSource && utmMedium && utmCampaign) {
        body.utmParams = { source: utmSource, medium: utmMedium, campaign: utmCampaign }
      }

      const res = await fetch(`/api/drafts/${draftId}/transform`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (res.ok) {
        onTransformed(data.html)
        setLastResult({ originalSize: data.originalSize, transformedSize: data.transformedSize })
        toast.success("Transforms applied")
      } else {
        toast.error(data.error || "Transform failed")
      }
    } catch {
      toast.error("Transform failed")
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="p-3">
      <div className="mb-3 flex items-center gap-1.5">
        <Wand2 className="h-3.5 w-3.5 text-gray-500" />
        <span className="text-xs font-semibold text-gray-700">Transformers</span>
      </div>

      <div className="space-y-2">
        <Toggle label="CSS Inline" description="Convert <style> to inline styles" checked={inlineCss} onChange={setInlineCss} />
        <Toggle label="Minify HTML" description="Reduce file size" checked={minifyHtml} onChange={setMinifyHtml} />
        <Toggle label="Clean CSS" description="Remove unused CSS" checked={cleanCss} onChange={setCleanCss} />
        <Toggle label="UTM Params" description="Append tracking params to links" checked={addUtm} onChange={setAddUtm} />
      </div>

      {addUtm && (
        <div className="mt-2 space-y-1.5 rounded border bg-white p-2">
          <input type="text" value={utmSource} onChange={(e) => setUtmSource(e.target.value)} placeholder="Source" className="w-full rounded border px-2 py-1 text-xs focus:border-blue-500 focus:outline-none" />
          <input type="text" value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} placeholder="Medium" className="w-full rounded border px-2 py-1 text-xs focus:border-blue-500 focus:outline-none" />
          <input type="text" value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} placeholder="Campaign" className="w-full rounded border px-2 py-1 text-xs focus:border-blue-500 focus:outline-none" />
        </div>
      )}

      {lastResult && (
        <div className="mt-2 rounded bg-green-50 px-2 py-1.5 text-xs text-green-700">
          {(lastResult.originalSize / 1024).toFixed(1)}KB → {(lastResult.transformedSize / 1024).toFixed(1)}KB
          {lastResult.originalSize > lastResult.transformedSize && (
            <span className="ml-1 font-medium">
              (-{((1 - lastResult.transformedSize / lastResult.originalSize) * 100).toFixed(0)}%)
            </span>
          )}
        </div>
      )}

      <button
        onClick={applyTransforms}
        disabled={applying}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {applying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
        {applying ? "Applying..." : "Apply All"}
      </button>
    </div>
  )
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded p-1.5 hover:bg-gray-100">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 rounded border-gray-300"
      />
      <div>
        <span className="block text-xs font-medium text-gray-700">{label}</span>
        <span className="block text-xs text-gray-400">{description}</span>
      </div>
    </label>
  )
}
