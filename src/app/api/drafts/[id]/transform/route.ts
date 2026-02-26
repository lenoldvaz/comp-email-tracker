import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import { transformSchema } from "@/lib/validations/draft"
import juice from "juice"
import { minify } from "html-minifier-terser"
import CleanCSS from "clean-css"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const body = await req.json()
  const parsed = transformSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()
  const { data: draft, error: fetchError } = await supabase
    .from("email_drafts")
    .select("html_content")
    .eq("id", id)
    .single()

  if (fetchError || !draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 })

  let html = draft.html_content
  const originalSize = Buffer.byteLength(html, "utf-8")

  // Apply transforms in order
  if (parsed.data.cleanCss) {
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
    html = html.replace(styleRegex, (_match: string, css: string) => {
      const cleaned = new CleanCSS({ level: 1 }).minify(css)
      return `<style>${cleaned.styles}</style>`
    })
  }

  if (parsed.data.inlineCss) {
    html = juice(html)
  }

  if (parsed.data.utmParams) {
    const { source, medium, campaign } = parsed.data.utmParams
    const utmString = `utm_source=${encodeURIComponent(source)}&utm_medium=${encodeURIComponent(medium)}&utm_campaign=${encodeURIComponent(campaign)}`
    html = html.replace(/href="(https?:\/\/[^"]+)"/g, (_match: string, url: string) => {
      const separator = url.includes("?") ? "&" : "?"
      return `href="${url}${separator}${utmString}"`
    })
  }

  if (parsed.data.minify) {
    html = await minify(html, {
      collapseWhitespace: true,
      removeComments: true,
      removeEmptyAttributes: true,
      minifyCSS: true,
    })
  }

  const transformedSize = Buffer.byteLength(html, "utf-8")

  return NextResponse.json({
    html,
    originalSize,
    transformedSize,
    savings: originalSize - transformedSize,
  })
}
