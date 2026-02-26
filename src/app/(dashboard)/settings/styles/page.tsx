"use client"

import { useState, useEffect } from "react"
import { useOrg } from "@/app/(dashboard)/org-context"
import { toast } from "sonner"
import type { GlobalStyles } from "@/types/draft"

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-8 cursor-pointer rounded border" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-32 rounded-md border px-3 py-1.5 text-sm font-mono focus:border-blue-500 focus:outline-none" />
      </div>
    </div>
  )
}

export default function GlobalStylesPage() {
  const { orgId } = useOrg()
  const [styles, setStyles] = useState<GlobalStyles | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchStyles() {
      const res = await fetch(`/api/styles?orgId=${orgId}`)
      if (res.ok) setStyles(await res.json())
      setLoading(false)
    }
    if (orgId) fetchStyles()
  }, [orgId])

  async function handleSave() {
    if (!styles) return
    setSaving(true)
    const res = await fetch("/api/styles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        primaryColor: styles.primaryColor,
        secondaryColor: styles.secondaryColor,
        fontFamily: styles.fontFamily,
        headingFont: styles.headingFont,
        buttonStyle: styles.buttonStyle,
        linkColor: styles.linkColor,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setStyles(data)
      toast.success("Styles saved")
    } else {
      toast.error("Failed to save styles")
    }
    setSaving(false)
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading...</div>
  if (!styles) return <div className="p-6 text-sm text-gray-500">Failed to load styles</div>

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Global Email Styles</h1>
          <p className="mt-1 text-sm text-gray-500">
            Set brand defaults used when building emails in the visual editor.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="space-y-6 rounded-lg border bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900">Colors</h2>
        <div className="grid grid-cols-2 gap-6">
          <ColorField label="Primary" value={styles.primaryColor} onChange={(v) => setStyles({ ...styles, primaryColor: v })} />
          <ColorField label="Secondary" value={styles.secondaryColor} onChange={(v) => setStyles({ ...styles, secondaryColor: v })} />
          <ColorField label="Link Color" value={styles.linkColor} onChange={(v) => setStyles({ ...styles, linkColor: v })} />
        </div>

        <div className="border-t pt-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Fonts</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Body Font</label>
              <input
                type="text"
                value={styles.fontFamily}
                onChange={(e) => setStyles({ ...styles, fontFamily: e.target.value })}
                className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Heading Font</label>
              <input
                type="text"
                value={styles.headingFont}
                onChange={(e) => setStyles({ ...styles, headingFont: e.target.value })}
                className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Button Defaults</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Border Radius</label>
              <input
                type="text"
                value={styles.buttonStyle.borderRadius}
                onChange={(e) => setStyles({ ...styles, buttonStyle: { ...styles.buttonStyle, borderRadius: e.target.value } })}
                className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Padding</label>
              <input
                type="text"
                value={styles.buttonStyle.padding}
                onChange={(e) => setStyles({ ...styles, buttonStyle: { ...styles.buttonStyle, padding: e.target.value } })}
                className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Live preview swatch */}
        <div className="border-t pt-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Preview</h2>
          <div className="rounded-lg border p-6" style={{ fontFamily: styles.fontFamily }}>
            <h3 style={{ fontFamily: styles.headingFont, color: styles.primaryColor, fontSize: "18px", marginBottom: "8px" }}>
              Heading Preview
            </h3>
            <p style={{ color: "#333", fontSize: "14px", marginBottom: "12px" }}>
              Body text using your selected font family. <a href="#" style={{ color: styles.linkColor }}>Link example</a>.
            </p>
            <span
              style={{
                display: "inline-block",
                backgroundColor: styles.primaryColor,
                color: "#fff",
                padding: styles.buttonStyle.padding,
                borderRadius: styles.buttonStyle.borderRadius,
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Button Preview
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
