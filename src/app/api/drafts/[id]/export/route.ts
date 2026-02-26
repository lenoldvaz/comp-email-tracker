import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import JSZip from "jszip"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const format = searchParams.get("format") || "html"

  const supabase = await createClient()
  const { data: draft, error: fetchError } = await supabase
    .from("email_drafts")
    .select("title, subject, html_content, text_content")
    .eq("id", id)
    .single()

  if (fetchError || !draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 })

  const filename = (draft.title || "email").replace(/[^a-zA-Z0-9-_]/g, "_")

  if (format === "zip") {
    const zip = new JSZip()
    zip.file(`${filename}.html`, draft.html_content)
    if (draft.text_content) {
      zip.file(`${filename}.txt`, draft.text_content)
    }

    const zipBuffer = await zip.generateAsync({ type: "uint8array" })
    return new NextResponse(zipBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}.zip"`,
      },
    })
  }

  // Default: HTML download
  return new NextResponse(draft.html_content, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `attachment; filename="${filename}.html"`,
    },
  })
}
