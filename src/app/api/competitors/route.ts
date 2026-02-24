import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireAdmin } from "@/lib/auth-utils"
import { createCompetitorSchema } from "@/types/schemas"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const supabase = await createClient()
  const { data: competitors, error: dbError } = await supabase
    .from("competitors")
    .select("*, emails(count)")
    .order("name")

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Transform count from Supabase's nested format
  const formatted = (competitors || []).map((c) => ({
    ...c,
    emails: undefined,
    _count: { emails: c.emails?.[0]?.count ?? 0 },
  }))

  return NextResponse.json(formatted)
}

export async function POST(req: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const parsed = createCompetitorSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: competitor, error: dbError } = await supabase
    .from("competitors")
    .insert({
      name: parsed.data.name,
      domains: parsed.data.domains,
      logo_url: parsed.data.logoUrl ?? null,
      colour_hex: parsed.data.colourHex ?? null,
    })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(competitor, { status: 201 })
}
