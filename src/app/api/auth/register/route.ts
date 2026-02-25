import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { z } from "zod/v4"

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(8),
  inviteToken: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { name, email, password, inviteToken } = parsed.data
    const supabase = createServiceClient()

    // Sign up via Supabase Auth (profile is set by the DB trigger)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true,
    })

    if (error) {
      if (error.message?.includes("already been registered")) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // If invite token provided, accept the invitation
    if (inviteToken && authData.user) {
      const { data: invitation } = await supabase
        .from("invitations")
        .select("*")
        .eq("token", inviteToken)
        .is("accepted_at", null)
        .single()

      if (invitation && new Date(invitation.expires_at) > new Date()) {
        // Add to org
        await supabase
          .from("org_members")
          .insert({
            org_id: invitation.org_id,
            user_id: authData.user.id,
            role: invitation.role,
          })

        // Mark invitation as accepted
        await supabase
          .from("invitations")
          .update({ accepted_at: new Date().toISOString() })
          .eq("id", invitation.id)
      }
    }

    return NextResponse.json({ message: "Account created" }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
