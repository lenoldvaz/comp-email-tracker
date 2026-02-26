import type { gmail_v1 } from "googleapis"
import { createServiceClient } from "@/lib/supabase/server"
import { getGmailClient } from "./client"
import { getCompetitorDomainList } from "@/lib/competitors/detector"

const BATCH_SIZE = 50
const SYNC_WINDOW_DAYS = 7

/**
 * Build a Gmail search query that only matches emails from competitor domains.
 * Uses a rolling window (default 7 days) so each run re-checks recent emails.
 * The processor's dedup check handles already-ingested messages.
 */
async function buildCompetitorQuery(): Promise<string | null> {
  const domains = await getCompetitorDomainList()
  if (domains.length === 0) return null
  const fromClause = domains.map((d) => `from:${d}`).join(" OR ")
  return `(${fromClause}) newer_than:${SYNC_WINDOW_DAYS}d`
}

export async function pollNewMessages(monitoredEmail: string, refreshToken: string) {
  const gmail = await getGmailClient(refreshToken)
  const supabase = createServiceClient()

  const competitorQuery = await buildCompetitorQuery()
  if (!competitorQuery) {
    console.log("No competitor domains configured — skipping Gmail sync")
    return []
  }

  // Get or create sync state (kept for tracking last_sync_at)
  let { data: syncState } = await supabase
    .from("gmail_sync_state")
    .select("*")
    .eq("email", monitoredEmail)
    .single()

  if (!syncState) {
    const { data: newState } = await supabase
      .from("gmail_sync_state")
      .insert({ email: monitoredEmail })
      .select()
      .single()
    syncState = newState
  }

  // Always query Gmail for competitor emails within the rolling window.
  // This is simpler and more reliable than the History API — duplicates
  // are handled by the processor's message_id dedup check.
  const messageIds = await fetchCompetitorMessages(gmail, competitorQuery)

  // Fetch full message details
  const messages: gmail_v1.Schema$Message[] = []
  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const batch = messageIds.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map((id) =>
        gmail.users.messages.get({
          userId: "me",
          id,
          format: "full",
        })
      )
    )
    messages.push(...results.map((r) => r.data))
  }

  // Update sync state timestamp
  await supabase
    .from("gmail_sync_state")
    .update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("email", monitoredEmail)

  return messages
}

/**
 * Fetch competitor emails within the rolling window, paginating through all results.
 */
async function fetchCompetitorMessages(gmail: gmail_v1.Gmail, query: string): Promise<string[]> {
  const messageIds: string[] = []
  let pageToken: string | undefined

  do {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 100,
      pageToken,
    })

    if (res.data.messages) {
      messageIds.push(...res.data.messages.map((m) => m.id!))
    }
    pageToken = res.data.nextPageToken || undefined
  } while (pageToken)

  return messageIds
}
