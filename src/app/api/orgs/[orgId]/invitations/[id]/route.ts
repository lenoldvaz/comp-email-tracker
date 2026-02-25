import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireOrgAdmin } from "@/lib/auth-utils"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; id: string }> }
) {
  const { orgId, id } = await params
  const { error } = await requireOrgAdmin(orgId)
  if (error) return error

  const supabase = await createClient()
  const { error: dbError } = await supabase
    .from("invitations")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ message: "Invitation revoked" })
}
