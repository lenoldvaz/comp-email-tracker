import type { gmail_v1 } from "googleapis"
import { createServiceClient } from "@/lib/supabase/server"
import { getGmailClient } from "./client"
import { getCompetitorDomainList } from "@/lib/competitors/detector"

const BATCH_SIZE = 50

/**
 * Build a Gmail search query that only matches emails from competitor domains.
 * e.g. "(from:acme.com OR from:globex.com) newer_than:90d"
 */
async function buildCompetitorQuery(): Promise<string | null> {
  const domains = await getCompetitorDomainList()
  if (domains.length === 0) return null
  const fromClause = domains.map((d) => `from:${d}`).join(" OR ")
  return `(${fromClause}) newer_than:90d`
}

export async function pollNewMessages(monitoredEmail: string, refreshToken: string) {
  const gmail = await getGmailClient(refreshToken)
  const supabase = createServiceClient()

  const competitorQuery = await buildCompetitorQuery()
  if (!competitorQuery) {
    console.log("No competitor domains configured — skipping Gmail sync")
    return []
  }

  // Get or create sync state
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

  let messageIds: string[] = []

  if (syncState?.history_id) {
    // Incremental sync using history API
    try {
      const history = await gmail.users.history.list({
        userId: "me",
        startHistoryId: syncState.history_id,
        historyTypes: ["messageAdded"],
        maxResults: 500,
      })

      if (history.data.history) {
        for (const h of history.data.history) {
          if (h.messagesAdded) {
            for (const m of h.messagesAdded) {
              if (m.message?.id) messageIds.push(m.message.id)
            }
          }
        }
      }

      // For incremental sync, we filter after fetching since the history API
      // doesn't support query filters. We'll check sender domains when processing.

      // Update historyId
      if (history.data.historyId) {
        await supabase
          .from("gmail_sync_state")
          .update({
            history_id: history.data.historyId,
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("email", monitoredEmail)
      }
    } catch (err: unknown) {
      const error = err as { code?: number }
      if (error.code === 404) {
        // historyId expired, do full sync
        messageIds = await fullSync(gmail, competitorQuery)
      } else {
        throw err
      }
    }
  } else {
    // First sync: only fetch emails from competitor domains
    messageIds = await fullSync(gmail, competitorQuery)
  }

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

  // Update sync state with latest historyId from profile
  const profile = await gmail.users.getProfile({ userId: "me" })
  if (profile.data.historyId) {
    await supabase
      .from("gmail_sync_state")
      .update({
        history_id: profile.data.historyId,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("email", monitoredEmail)
  }

  return messages
}

/**
 * Full sync — uses Gmail's `q` parameter to only fetch messages from competitor domains.
 */
async function fullSync(gmail: gmail_v1.Gmail, query: string): Promise<string[]> {
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
