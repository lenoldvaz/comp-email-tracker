import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null, profile: null }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", user.id)
    .single()

  return { error: null, user, profile }
}

export async function requireAdmin() {
  const { error, user, profile } = await requireAuth()
  if (error) return { error, user: null, profile: null }

  if (profile?.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null, profile: null }
  }

  return { error: null, user: user!, profile: profile! }
}
