import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth-utils"
import { getOAuth2Client } from "@/lib/gmail/client"

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const supabase = await createClient()
  const { data: syncState } = await supabase
    .from("gmail_sync_state")
    .select("*")
    .limit(1)
    .single()

  return NextResponse.json({
    connected: !!syncState && !!process.env.GMAIL_REFRESH_TOKEN,
    email: syncState?.email || null,
    lastSyncAt: syncState?.last_sync_at || null,
    historyId: syncState?.history_id || null,
  })
}

export async function POST(req: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const { action } = await req.json()

  if (action === "connect") {
    const oauth2Client = getOAuth2Client()
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/gmail.readonly"],
      prompt: "consent",
    })
    return NextResponse.json({ authUrl })
  }

  if (action === "disconnect") {
    const supabase = await createClient()
    await supabase.from("gmail_sync_state").delete().neq("id", "")
    return NextResponse.json({ message: "Disconnected" })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
