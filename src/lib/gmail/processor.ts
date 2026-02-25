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

  // Process for each org that has gmail configured
  const { data: syncStates } = await supabase
    .from("gmail_sync_state")
    .select("*, org_id")

  if (!syncStates || syncStates.length === 0) {
    throw new Error("Gmail not connected. Please configure Gmail in settings.")
  }

  let totalProcessed = 0
  let totalDuplicates = 0
  let totalFailed = 0

  for (const syncState of syncStates) {
    // Get refresh token from environment (stored securely)
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN
    if (!refreshToken) {
      continue
    }

    const messages = await pollNewMessages(syncState.email, refreshToken)

    for (const message of messages) {
      try {
        const parsed = parseGmailMessage(message)
        if (!parsed) {
          await supabase.from("ingestion_logs").insert({
            message_id: message.id || null,
            status: "failed",
            error_message: "Could not parse email message",
            org_id: syncState.org_id,
          })
          totalFailed++
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
            org_id: syncState.org_id,
          })
          totalDuplicates++
          continue
        }

        // Detect competitor — skip emails not from a known competitor domain
        const competitorId = await detectCompetitor(parsed.senderAddress)
        if (!competitorId) {
          continue
        }

        // Store email with org_id
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
          org_id: syncState.org_id,
        })

        await supabase.from("ingestion_logs").insert({
          message_id: parsed.messageId,
          status: "success",
          org_id: syncState.org_id,
        })

        totalProcessed++
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        await supabase.from("ingestion_logs").insert({
          message_id: message.id || null,
          status: "failed",
          error_message: errorMessage,
          org_id: syncState.org_id,
        })
        totalFailed++
      }
    }
  }

  return { processed: totalProcessed, duplicates: totalDuplicates, failed: totalFailed }
}
