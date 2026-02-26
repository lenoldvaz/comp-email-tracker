import { createServiceClient } from "@/lib/supabase/server"
import { pollNewMessages } from "./poller"
import { parseGmailMessage } from "./parser"
import { detectCompetitor } from "@/lib/competitors/detector"
import { analyzeEmail } from "@/lib/ai/client"

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

    // Fetch category names for AI prompt (once per org)
    const { data: orgCategories } = await supabase
      .from("categories")
      .select("name")
      .eq("org_id", syncState.org_id)
    const categoryNames = (orgCategories || []).map((c) => c.name)

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
          await supabase.from("ingestion_logs").insert({
            message_id: parsed.messageId,
            status: "skipped",
            error_message: `Sender not a competitor: ${parsed.senderAddress}`,
            org_id: syncState.org_id,
          })
          continue
        }

        // Store email with org_id
        const { data: inserted } = await supabase
          .from("emails")
          .insert({
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
          .select("id")
          .single()

        // AI analysis — non-blocking (failures don't affect ingestion)
        if (inserted?.id) {
          try {
            // Fetch competitor name for AI context
            const { data: competitor } = await supabase
              .from("competitors")
              .select("name")
              .eq("id", competitorId)
              .single()

            const aiResult = await analyzeEmail({
              subject: parsed.subject,
              bodyText: parsed.bodyText,
              senderAddress: parsed.senderAddress,
              competitorName: competitor?.name || "Unknown",
              categoryNames,
            })

            if (aiResult) {
              await supabase
                .from("emails")
                .update({
                  ai_summary: aiResult.summary,
                  ai_category: aiResult.category,
                  ai_tags: aiResult.tags,
                  ai_sentiment: aiResult.sentiment,
                  ai_processed_at: new Date().toISOString(),
                })
                .eq("id", inserted.id)
            }
          } catch (aiErr) {
            console.error("AI analysis failed for email:", inserted.id, aiErr)
          }
        }

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
