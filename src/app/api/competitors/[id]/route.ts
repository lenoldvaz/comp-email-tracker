import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireAdmin } from "@/lib/auth-utils"
import { updateCompetitorSchema } from "@/types/schemas"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const supabase = await createClient()
  const { data: competitor, error: dbError } = await supabase
    .from("competitors")
    .select("*, emails(count)")
    .eq("id", id)
    .single()

  if (dbError || !competitor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({
    ...competitor,
    emails: undefined,
    _count: { emails: competitor.emails?.[0]?.count ?? 0 },
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await req.json()
  const parsed = updateCompetitorSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })
  }

  const supabase = await createClient()
  const updateData: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if (parsed.data.domains !== undefined) updateData.domains = parsed.data.domains
  if (parsed.data.logoUrl !== undefined) updateData.logo_url = parsed.data.logoUrl
  if (parsed.data.colourHex !== undefined) updateData.colour_hex = parsed.data.colourHex
  updateData.updated_at = new Date().toISOString()

  const { data: competitor, error: dbError } = await supabase
    .from("competitors")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(competitor)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const supabase = await createClient()
  const { error: dbError } = await supabase
    .from("competitors")
    .delete()
    .eq("id", id)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ message: "Deleted" })
}
