import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireOrgMember } from "@/lib/auth-utils"

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get("orgId")

  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: settings } = await supabase
    .from("cron_settings")
    .select("*")
    .eq("org_id", orgId)
    .single()

  // Return defaults if no settings exist yet
  return NextResponse.json(
    settings || {
      org_id: orgId,
      schedule: "0 8 * * *",
      enabled: true,
      notify_on_failure: false,
      notify_email: null,
    }
  )
}

export async function PUT(req: Request) {
  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get("orgId")

  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 })
  }

  const { error, orgRole } = await requireOrgMember(orgId)
  if (error) return error

  if (orgRole === "VIEWER") {
    return NextResponse.json({ error: "Viewers cannot modify settings" }, { status: 403 })
  }

  const body = await req.json()
  const { schedule, enabled, notify_on_failure, notify_email } = body

  const supabase = await createClient()

  // Upsert settings
  const { data, error: dbError } = await supabase
    .from("cron_settings")
    .upsert(
      {
        org_id: orgId,
        schedule: schedule ?? "0 8 * * *",
        enabled: enabled ?? true,
        notify_on_failure: notify_on_failure ?? false,
        notify_email: notify_email ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id" }
    )
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
