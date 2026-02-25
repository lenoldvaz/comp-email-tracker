import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireOrgAdmin } from "@/lib/auth-utils"
import { z } from "zod/v4"

const updateOrgSchema = z.object({
  name: z.string().min(1).max(100),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const { error } = await requireOrgAdmin(orgId)
  if (error) return error

  const body = await req.json()
  const parsed = updateOrgSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: org, error: dbError } = await supabase
    .from("organizations")
    .update({ name: parsed.data.name })
    .eq("id", orgId)
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(org)
}
