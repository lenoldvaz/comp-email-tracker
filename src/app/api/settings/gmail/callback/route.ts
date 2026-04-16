import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getOAuth2Client } from "@/lib/gmail/client"
import { google } from "googleapis"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")

  if (!code) {
    return NextResponse.redirect(new URL("/settings?error=no_code", req.url))
  }

  try {
    // Get current user's org_id
    const userSupabase = await createClient()
    const { data: { user } } = await userSupabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL("/settings?error=not_authenticated", req.url))
    }

    const { data: membership } = await userSupabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true })
      .limit(1)
      .single()

    if (!membership) {
      return NextResponse.redirect(new URL("/settings?error=no_org", req.url))
    }

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
      .select("id, refresh_token")
      .eq("email", email)
      .single()

    if (existing) {
      await supabase
        .from("gmail_sync_state")
        .update({
          history_id: profile.data.historyId || null,
          refresh_token: tokens.refresh_token || existing.refresh_token,
          updated_at: new Date().toISOString(),
        })
        .eq("email", email)
    } else {
      await supabase
        .from("gmail_sync_state")
        .insert({
          email,
          org_id: membership.org_id,
          history_id: profile.data.historyId || null,
          refresh_token: tokens.refresh_token || null,
        })
    }

    return NextResponse.redirect(new URL("/settings?gmail=connected", req.url))
  } catch (err) {
    console.error("Gmail callback error:", err)
    return NextResponse.redirect(new URL("/settings?error=auth_failed", req.url))
  }
}
