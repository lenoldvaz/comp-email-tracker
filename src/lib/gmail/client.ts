import { google } from "googleapis"

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/settings/gmail/callback`
  )
}

export async function getGmailClient(refreshToken: string) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return google.gmail({ version: "v1", auth: oauth2Client })
}
