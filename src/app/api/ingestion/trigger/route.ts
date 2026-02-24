import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-utils"
import { processNewEmails } from "@/lib/gmail/processor"

export async function POST() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const result = await processNewEmails()
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
