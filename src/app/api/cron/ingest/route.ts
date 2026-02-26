import { NextResponse } from "next/server"
import { processNewEmails } from "@/lib/gmail/processor"
import { createServiceClient } from "@/lib/supabase/server"

function verifySecret(req: Request): boolean {
  const authHeader = req.headers.get("authorization")
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

async function runIngestion(trigger: "cron" | "manual") {
  const supabase = createServiceClient()

  // Get org_id from first sync state (same pattern as processor.ts)
  const { data: syncStates } = await supabase
    .from("gmail_sync_state")
    .select("org_id")
    .limit(1)

  const orgId = syncStates?.[0]?.org_id
  if (!orgId) {
    throw new Error("Gmail not connected. No sync state found.")
  }

  // Insert running record
  const runId = crypto.randomUUID()
  const startedAt = new Date()
  await supabase.from("cron_runs").insert({
    id: runId,
    org_id: orgId,
    status: "running",
    trigger,
    started_at: startedAt.toISOString(),
  })

  try {
    const result = await processNewEmails()
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

    return result
  } catch (err) {
    const finishedAt = new Date()
    const durationMs = finishedAt.getTime() - startedAt.getTime()
    const message = err instanceof Error ? err.message : "Unknown error"

    await supabase
      .from("cron_runs")
      .update({
        status: "failed",
        finished_at: finishedAt.toISOString(),
        error_message: message,
        duration_ms: durationMs,
      })
      .eq("id", runId)

    throw err
  }
}

export async function GET(req: Request) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await runIngestion("cron")
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await runIngestion("cron")
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
