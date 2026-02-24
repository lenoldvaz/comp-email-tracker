import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import { createTagSchema } from "@/types/schemas"

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")

  const supabase = await createClient()
  let query = supabase
    .from("tags")
    .select("*, email_tags(count)")
    .order("name")
    .limit(50)

  if (q) {
    query = query.ilike("name", `${q.toLowerCase()}%`)
  }

  const { data: tags, error: dbError } = await query

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  const formatted = (tags || []).map((t) => ({
    ...t,
    email_tags: undefined,
    _count: { emails: t.email_tags?.[0]?.count ?? 0 },
  }))

  return NextResponse.json(formatted)
}

export async function POST(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const parsed = createTagSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })
  }

  const supabase = await createClient()

  // Check if tag exists
  const { data: existing } = await supabase
    .from("tags")
    .select("*")
    .eq("name", parsed.data.name)
    .single()

  if (existing) {
    return NextResponse.json(existing)
  }

  const { data: tag, error: dbError } = await supabase
    .from("tags")
    .insert({ name: parsed.data.name })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(tag, { status: 201 })
}
