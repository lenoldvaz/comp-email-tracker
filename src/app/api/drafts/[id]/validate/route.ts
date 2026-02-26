import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import type { ValidationResult, ValidationItem } from "@/types/draft"

const SPAM_WORDS = [
  "free", "act now", "limited time", "urgent", "winner", "congratulations",
  "click here", "buy now", "order now", "100% free", "no obligation",
  "risk free", "cash", "million dollars", "earn money",
]

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const supabase = await createClient()
  const { data: draft, error: fetchError } = await supabase
    .from("email_drafts")
    .select("html_content, text_content, subject")
    .eq("id", id)
    .single()

  if (fetchError || !draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 })

  const html = draft.html_content || ""
  const results: ValidationResult[] = []

  // --- Link checks ---
  const linkItems: ValidationItem[] = []
  const linkRegex = /href="(https?:\/\/[^"]+)"/g
  let linkMatch
  const links: string[] = []
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    links.push(linkMatch[1])
  }
  if (links.length === 0) {
    linkItems.push({ severity: "warn", message: "No links found in email" })
  } else {
    linkItems.push({ severity: "pass", message: `${links.length} link(s) found` })
    // Check for http (non-https) links
    const httpLinks = links.filter((l) => l.startsWith("http://"))
    if (httpLinks.length > 0) {
      linkItems.push({ severity: "warn", message: `${httpLinks.length} link(s) use HTTP instead of HTTPS`, details: httpLinks.join(", ") })
    }
  }
  results.push({ category: "links", items: linkItems })

  // --- Image checks ---
  const imageItems: ValidationItem[] = []
  const imgRegex = /<img\s[^>]*>/gi
  const images = html.match(imgRegex) || []
  if (images.length === 0) {
    imageItems.push({ severity: "pass", message: "No images in email" })
  } else {
    imageItems.push({ severity: "pass", message: `${images.length} image(s) found` })
    const noAlt = images.filter((img: string) => !img.includes('alt="') || img.includes('alt=""'))
    if (noAlt.length > 0) {
      imageItems.push({ severity: "fail", message: `${noAlt.length} image(s) missing alt text` })
    }
    const httpImages = images.filter((img: string) => img.includes('src="http://'))
    if (httpImages.length > 0) {
      imageItems.push({ severity: "warn", message: `${httpImages.length} image(s) use HTTP instead of HTTPS` })
    }
  }
  results.push({ category: "images", items: imageItems })

  // --- Accessibility checks ---
  const a11yItems: ValidationItem[] = []
  if (!html.includes('lang="') && !html.includes("lang='")) {
    a11yItems.push({ severity: "warn", message: "Missing lang attribute on <html> tag" })
  }
  if (!html.includes("<title") && !html.includes("<title>")) {
    a11yItems.push({ severity: "warn", message: "Missing <title> tag" })
  }
  const roleRegex = /role="/g
  const hasRoles = roleRegex.test(html)
  if (hasRoles) {
    a11yItems.push({ severity: "pass", message: "ARIA roles detected" })
  }
  if (a11yItems.length === 0) {
    a11yItems.push({ severity: "pass", message: "Basic accessibility checks passed" })
  }
  results.push({ category: "accessibility", items: a11yItems })

  // --- Spam score ---
  const spamItems: ValidationItem[] = []
  const lowerHtml = html.toLowerCase()
  const lowerSubject = (draft.subject || "").toLowerCase()
  const foundSpamWords = SPAM_WORDS.filter(
    (w) => lowerHtml.includes(w) || lowerSubject.includes(w)
  )
  if (foundSpamWords.length > 0) {
    spamItems.push({ severity: "warn", message: `Found ${foundSpamWords.length} spam trigger word(s)`, details: foundSpamWords.join(", ") })
  } else {
    spamItems.push({ severity: "pass", message: "No spam trigger words detected" })
  }

  // All-caps check
  const textContent = draft.text_content || html.replace(/<[^>]+>/g, "")
  const words = textContent.split(/\s+/).filter((w: string) => w.length > 2)
  const capsWords = words.filter((w: string) => w === w.toUpperCase() && /[A-Z]/.test(w))
  const capsPercent = words.length > 0 ? (capsWords.length / words.length) * 100 : 0
  if (capsPercent > 30) {
    spamItems.push({ severity: "warn", message: `${capsPercent.toFixed(0)}% all-caps words (keep under 30%)` })
  }

  // Image-to-text ratio
  const imgCount = (html.match(/<img/gi) || []).length
  const textLength = textContent.trim().length
  if (imgCount > 0 && textLength < 100) {
    spamItems.push({ severity: "warn", message: "Low text-to-image ratio — may trigger spam filters" })
  }

  // Unsubscribe link
  if (!lowerHtml.includes("unsubscribe")) {
    spamItems.push({ severity: "warn", message: "No unsubscribe link found" })
  }

  results.push({ category: "spam", items: spamItems })

  // --- Gmail clipping ---
  const clippingItems: ValidationItem[] = []
  const sizeBytes = Buffer.byteLength(html, "utf-8")
  const sizeKB = sizeBytes / 1024
  if (sizeKB > 102) {
    clippingItems.push({ severity: "fail", message: `HTML is ${sizeKB.toFixed(0)}KB — Gmail clips emails over 102KB` })
  } else if (sizeKB > 80) {
    clippingItems.push({ severity: "warn", message: `HTML is ${sizeKB.toFixed(0)}KB — approaching Gmail's 102KB clipping limit` })
  } else {
    clippingItems.push({ severity: "pass", message: `HTML is ${sizeKB.toFixed(0)}KB — within Gmail's 102KB limit` })
  }
  results.push({ category: "clipping", items: clippingItems })

  return NextResponse.json({ results })
}
