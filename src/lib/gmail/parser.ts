import type { gmail_v1 } from "googleapis"

export interface ParsedEmail {
  messageId: string
  subject: string
  senderAddress: string
  senderName: string | null
  receivedAt: Date
  bodyText: string | null
  bodyHtml: string | null
  snippet: string | null
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[], name: string): string | null {
  const header = headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())
  return header?.value || null
}

function parseSender(from: string): { name: string | null; address: string } {
  // "John Doe <john@example.com>" or "john@example.com"
  const match = from.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/)
  if (match) {
    return { name: match[1]?.trim() || null, address: match[2].trim() }
  }
  return { name: null, address: from.trim() }
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/")
  return Buffer.from(base64, "base64").toString("utf-8")
}

function extractBody(
  payload: gmail_v1.Schema$MessagePart
): { text: string | null; html: string | null } {
  let text: string | null = null
  let html: string | null = null

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    text = decodeBase64Url(payload.body.data)
  } else if (payload.mimeType === "text/html" && payload.body?.data) {
    html = decodeBase64Url(payload.body.data)
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const result = extractBody(part)
      if (result.text && !text) text = result.text
      if (result.html && !html) html = result.html
    }
  }

  return { text, html }
}

export function parseGmailMessage(message: gmail_v1.Schema$Message): ParsedEmail | null {
  const headers = message.payload?.headers || []
  const from = getHeader(headers, "From")
  const subject = getHeader(headers, "Subject") || "(No subject)"
  const date = getHeader(headers, "Date")
  const gmailMessageId = getHeader(headers, "Message-ID") || message.id || ""

  if (!from) return null

  const sender = parseSender(from)
  const { text, html } = message.payload ? extractBody(message.payload) : { text: null, html: null }

  const bodyText = text
  // Prefer Gmail's snippet (clean text preview) over raw body text
  const snippet = message.snippet
    || (bodyText ? bodyText.replace(/\s+/g, " ").trim().slice(0, 200) : null)

  return {
    messageId: gmailMessageId,
    subject,
    senderAddress: sender.address,
    senderName: sender.name,
    receivedAt: date ? new Date(date) : new Date(parseInt(message.internalDate || "0", 10)),
    bodyText,
    bodyHtml: html,
    snippet,
  }
}
