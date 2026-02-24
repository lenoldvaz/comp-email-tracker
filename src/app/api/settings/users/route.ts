import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth-utils"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const supabase = await createClient()

  // Get profiles joined with auth user email
  const { data: profiles, error: dbError } = await supabase
    .from("profiles")
    .select("id, name, role, created_at")
    .order("created_at")

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Get emails from auth.users via admin API
  const serviceClient = createServiceClient()
  const { data: { users } } = await serviceClient.auth.admin.listUsers()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMap = new Map(users.map((u: any) => [u.id, u.email || ""]))

  const result = (profiles || []).map((p) => ({
    id: p.id,
    name: p.name,
    email: userMap.get(p.id) || null,
    role: p.role,
    createdAt: p.created_at,
  }))

  return NextResponse.json(result)
}
