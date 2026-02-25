import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import { z } from "zod/v4"

const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
})

export async function GET() {
  const { error, user } = await requireAuth()
  if (error) return error

  const supabase = await createClient()
  const { data: memberships, error: dbError } = await supabase
    .from("org_members")
    .select("org_id, role, joined_at, organizations(id, name, slug)")
    .eq("user_id", user!.id)
    .order("joined_at", { ascending: true })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  const orgs = (memberships || []).map((m) => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: (m.organizations as any)?.id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: (m.organizations as any)?.name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    slug: (m.organizations as any)?.slug,
    role: m.role,
    joinedAt: m.joined_at,
  }))

  return NextResponse.json(orgs)
}

export async function POST(req: Request) {
  const { error, user } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const parsed = createOrgSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })
  }

  const slug = parsed.data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  const supabase = await createClient()

  // Create org
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: parsed.data.name, slug: `${slug}-${Date.now().toString(36)}` })
    .select()
    .single()

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 500 })
  }

  // Add creator as admin
  const { error: memberError } = await supabase
    .from("org_members")
    .insert({ org_id: org.id, user_id: user!.id, role: "ADMIN" })

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  return NextResponse.json(org, { status: 201 })
}
