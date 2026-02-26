import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireOrgMember } from "@/lib/auth-utils"
import { updateGlobalStylesSchema } from "@/lib/validations/draft"

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get("orgId")
  if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 })

  const supabase = await createClient()
  const { data, error: dbError } = await supabase
    .from("global_styles")
    .select("*")
    .eq("org_id", orgId)
    .single()

  if (dbError || !data) {
    // Return defaults if no styles exist yet
    return NextResponse.json({
      id: null,
      orgId,
      primaryColor: "#3b82f6",
      secondaryColor: "#64748b",
      fontFamily: "Arial, Helvetica, sans-serif",
      headingFont: "Arial, Helvetica, sans-serif",
      buttonStyle: { borderRadius: "4px", padding: "12px 24px" },
      linkColor: "#3b82f6",
      updatedAt: null,
    })
  }

  return NextResponse.json({
    id: data.id,
    orgId: data.org_id,
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
    fontFamily: data.font_family,
    headingFont: data.heading_font,
    buttonStyle: data.button_style,
    linkColor: data.link_color,
    updatedAt: data.updated_at,
  })
}

export async function PUT(req: Request) {
  const body = await req.json()
  const { orgId, ...rest } = body

  if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 })

  const { error, orgRole } = await requireOrgMember(orgId)
  if (error) return error
  if (orgRole === "VIEWER") return NextResponse.json({ error: "Viewers cannot update styles" }, { status: 403 })

  const parsed = updateGlobalStylesSchema.safeParse(rest)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.data.primaryColor !== undefined) updates.primary_color = parsed.data.primaryColor
  if (parsed.data.secondaryColor !== undefined) updates.secondary_color = parsed.data.secondaryColor
  if (parsed.data.fontFamily !== undefined) updates.font_family = parsed.data.fontFamily
  if (parsed.data.headingFont !== undefined) updates.heading_font = parsed.data.headingFont
  if (parsed.data.buttonStyle !== undefined) updates.button_style = parsed.data.buttonStyle
  if (parsed.data.linkColor !== undefined) updates.link_color = parsed.data.linkColor

  const supabase = await createClient()

  // Upsert: insert if doesn't exist, update if it does
  const { data, error: dbError } = await supabase
    .from("global_styles")
    .upsert({
      org_id: orgId,
      ...updates,
    }, { onConflict: "org_id" })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({
    id: data.id,
    orgId: data.org_id,
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
    fontFamily: data.font_family,
    headingFont: data.heading_font,
    buttonStyle: data.button_style,
    linkColor: data.link_color,
    updatedAt: data.updated_at,
  })
}
