import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { z } from "zod/v4"

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(8),
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

    const { name, email, password } = parsed.data
    const supabase = createServiceClient()

    // Sign up via Supabase Auth (profile + role is set by the DB trigger)
    const { error } = await supabase.auth.admin.createUser({
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

    return NextResponse.json({ message: "Account created" }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
