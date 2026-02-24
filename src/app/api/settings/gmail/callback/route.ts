import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { getOAuth2Client } from "@/lib/gmail/client"
import { google } from "googleapis"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")

  if (!code) {
    return NextResponse.redirect(new URL("/settings?error=no_code", req.url))
  }

  try {
    const oauth2Client = getOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Get the email address
    const gmail = google.gmail({ version: "v1", auth: oauth2Client })
    const profile = await gmail.users.getProfile({ userId: "me" })
    const email = profile.data.emailAddress!

    // Store sync state using service client (bypasses RLS)
    const supabase = createServiceClient()

    const { data: existing } = await supabase
      .from("gmail_sync_state")
      .select("id")
      .eq("email", email)
      .single()

    if (existing) {
      await supabase
        .from("gmail_sync_state")
        .update({
          history_id: profile.data.historyId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("email", email)
    } else {
      await supabase
        .from("gmail_sync_state")
        .insert({
          email,
          history_id: profile.data.historyId || null,
        })
    }

    // Note: In production, store refresh_token securely (encrypted in DB).
    // For MVP, the refresh token should be set as GMAIL_REFRESH_TOKEN env var.
    if (tokens.refresh_token) {
      console.log("=== Gmail Refresh Token (add to .env as GMAIL_REFRESH_TOKEN) ===")
      console.log(tokens.refresh_token)
      console.log("================================================================")
    }

    return NextResponse.redirect(new URL("/settings?gmail=connected", req.url))
  } catch (err) {
    console.error("Gmail callback error:", err)
    return NextResponse.redirect(new URL("/settings?error=auth_failed", req.url))
  }
}
