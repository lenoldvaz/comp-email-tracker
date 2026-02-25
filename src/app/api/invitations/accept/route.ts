import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { z } from "zod/v4"

const acceptSchema = z.object({
  token: z.string().min(1),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = acceptSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  // Use service client to bypass RLS for reading invitation
  const serviceClient = createServiceClient()

  const { data: invitation, error: invError } = await serviceClient
    .from("invitations")
    .select("*")
    .eq("token", parsed.data.token)
    .is("accepted_at", null)
    .single()

  if (invError || !invitation) {
    return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 })
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invitation has expired" }, { status: 410 })
  }

  // Check if already a member
  const { data: existing } = await serviceClient
    .from("org_members")
    .select("user_id")
    .eq("org_id", invitation.org_id)
    .eq("user_id", user.id)
    .single()

  if (existing) {
    // Mark as accepted anyway
    await serviceClient
      .from("invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id)

    return NextResponse.json({ message: "Already a member", orgId: invitation.org_id })
  }

  // Add user to org
  const { error: memberError } = await serviceClient
    .from("org_members")
    .insert({
      org_id: invitation.org_id,
      user_id: user.id,
      role: invitation.role,
    })

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  // Mark invitation as accepted
  await serviceClient
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id)

  return NextResponse.json({ message: "Invitation accepted", orgId: invitation.org_id })
}

// GET to validate a token (for the invite page)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 })
  }

  const serviceClient = createServiceClient()
  const { data: invitation } = await serviceClient
    .from("invitations")
    .select("id, org_id, email, role, expires_at, organizations(name)")
    .eq("token", token)
    .is("accepted_at", null)
    .single()

  if (!invitation) {
    return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 })
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invitation has expired" }, { status: 410 })
  }

  return NextResponse.json({
    email: invitation.email,
    role: invitation.role,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orgName: (invitation.organizations as any)?.name || "Unknown",
  })
}
