import { NextResponse } from "next/server"
import { requireAdmin, getActiveOrg } from "@/lib/auth-utils"
import { processNewEmails } from "@/lib/gmail/processor"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST() {
  const { error, user } = await requireAdmin()
  if (error) return error

  const { org } = await getActiveOrg(user!.id)
  const orgId = org?.orgId

  const supabase = createServiceClient()

  // Insert running record if we have an org
  const runId = orgId ? crypto.randomUUID() : null
  const startedAt = new Date()

  if (runId && orgId) {
    await supabase.from("cron_runs").insert({
      id: runId,
      org_id: orgId,
      status: "running",
      trigger: "manual",
      started_at: startedAt.toISOString(),
    })
  }

  try {
    const result = await processNewEmails()

    if (runId && orgId) {
      const finishedAt = new Date()
      const durationMs = finishedAt.getTime() - startedAt.getTime()

      await supabase
        .from("cron_runs")
        .update({
          status: "success",
          finished_at: finishedAt.toISOString(),
          emails_processed: result.processed,
          emails_duplicates: result.duplicates,
          emails_failed: result.failed,
          duration_ms: durationMs,
        })
        .eq("id", runId)
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"

    if (runId && orgId) {
      const finishedAt = new Date()
      const durationMs = finishedAt.getTime() - startedAt.getTime()

      await supabase
        .from("cron_runs")
        .update({
          status: "failed",
          finished_at: finishedAt.toISOString(),
          error_message: message,
          duration_ms: durationMs,
        })
        .eq("id", runId)
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
