import { createServiceClient } from "@/lib/supabase/server"
import { pollNewMessages } from "./poller"
import { parseGmailMessage } from "./parser"
import { detectCompetitor } from "@/lib/competitors/detector"

interface ProcessResult {
  processed: number
  duplicates: number
  failed: number
}

export async function processNewEmails(): Promise<ProcessResult> {
  const supabase = createServiceClient()

  const { data: syncState } = await supabase
    .from("gmail_sync_state")
    .select("*")
    .limit(1)
    .single()

  if (!syncState) {
    throw new Error("Gmail not connected. Please configure Gmail in settings.")
  }

  // Get refresh token from environment (stored securely)
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN
  if (!refreshToken) {
    throw new Error("GMAIL_REFRESH_TOKEN not configured")
  }

  const messages = await pollNewMessages(syncState.email, refreshToken)

  let processed = 0
  let duplicates = 0
  let failed = 0

  for (const message of messages) {
    try {
      const parsed = parseGmailMessage(message)
      if (!parsed) {
        await supabase.from("ingestion_logs").insert({
          message_id: message.id || null,
          status: "failed",
          error_message: "Could not parse email message",
        })
        failed++
        continue
      }

      // Check dedup
      const { data: existing } = await supabase
        .from("emails")
        .select("id")
        .eq("message_id", parsed.messageId)
        .single()

      if (existing) {
        await supabase.from("ingestion_logs").insert({
          message_id: parsed.messageId,
          status: "duplicate",
        })
        duplicates++
        continue
      }

      // Detect competitor
      const competitorId = await detectCompetitor(parsed.senderAddress)

      // Store email
      await supabase.from("emails").insert({
        message_id: parsed.messageId,
        subject: parsed.subject,
        sender_address: parsed.senderAddress,
        sender_name: parsed.senderName,
        received_at: parsed.receivedAt.toISOString(),
        body_text: parsed.bodyText,
        body_html: parsed.bodyHtml,
        snippet: parsed.snippet,
        competitor_id: competitorId,
      })

      await supabase.from("ingestion_logs").insert({
        message_id: parsed.messageId,
        status: "success",
      })

      processed++
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      await supabase.from("ingestion_logs").insert({
        message_id: message.id || null,
        status: "failed",
        error_message: errorMessage,
      })
      failed++
    }
  }

  return { processed, duplicates, failed }
}
