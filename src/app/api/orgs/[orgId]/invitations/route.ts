import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireOrgAdmin } from "@/lib/auth-utils"
import { z } from "zod/v4"
import crypto from "crypto"

const createInvitationSchema = z.object({
  email: z.email(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const { error } = await requireOrgAdmin(orgId)
  if (error) return error

  const supabase = await createClient()
  const { data: invitations, error: dbError } = await supabase
    .from("invitations")
    .select("*")
    .eq("org_id", orgId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(invitations || [])
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const { error, user } = await requireOrgAdmin(orgId)
  if (error) return error

  const body = await req.json()
  const parsed = createInvitationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })
  }

  const supabase = await createClient()

  // Check if user is already a member
  const { data: existingMembers } = await supabase
    .from("org_members")
    .select("user_id, profiles!inner(id)")
    .eq("org_id", orgId)

  // Check via auth users
  const { createServiceClient } = await import("@/lib/supabase/server")
  const serviceClient = createServiceClient()
  const { data: { users } } = await serviceClient.auth.admin.listUsers()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingUser = users.find((u: any) => u.email === parsed.data.email)

  if (existingUser) {
    const isMember = (existingMembers || []).some((m) => m.user_id === existingUser.id)
    if (isMember) {
      return NextResponse.json({ error: "User is already a member of this organization" }, { status: 409 })
    }
  }

  // Check for pending invitation
  const { data: existingInvite } = await supabase
    .from("invitations")
    .select("id")
    .eq("org_id", orgId)
    .eq("email", parsed.data.email)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single()

  if (existingInvite) {
    return NextResponse.json({ error: "An invitation is already pending for this email" }, { status: 409 })
  }

  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const { data: invitation, error: dbError } = await supabase
    .from("invitations")
    .insert({
      org_id: orgId,
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: user!.id,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/invite?token=${token}`

  return NextResponse.json({ ...invitation, inviteUrl }, { status: 201 })
}
