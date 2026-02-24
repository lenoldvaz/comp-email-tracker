import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireAdmin } from "@/lib/auth-utils"
import { createCategorySchema } from "@/types/schemas"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const supabase = await createClient()
  const { data: categories, error: dbError } = await supabase
    .from("categories")
    .select("*, emails(count)")
    .order("name")

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  const formatted = (categories || []).map((c) => ({
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
  const parsed = createCategorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: category, error: dbError } = await supabase
    .from("categories")
    .insert({ name: parsed.data.name })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(category, { status: 201 })
}
