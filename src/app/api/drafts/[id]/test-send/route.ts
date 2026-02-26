import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import { testSendSchema } from "@/lib/validations/draft"
import nodemailer from "nodemailer"
import juice from "juice"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return NextResponse.json({ error: "SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS environment variables." }, { status: 500 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = testSendSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()
  const { data: draft, error: fetchError } = await supabase
    .from("email_drafts")
    .select("subject, html_content, text_content")
    .eq("id", id)
    .single()

  if (fetchError || !draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 })

  const inlinedHtml = juice(draft.html_content)

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const subject = parsed.data.subject || draft.subject || "Test Email"

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: parsed.data.to.join(", "),
      subject: `[TEST] ${subject}`,
      html: inlinedHtml,
      text: draft.text_content || undefined,
    })

    return NextResponse.json({ success: true, sentTo: parsed.data.to })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
