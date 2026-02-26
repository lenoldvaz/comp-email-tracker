import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import { analyzeEmail } from "@/lib/ai/client"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth()
  if (error) return error

  const { id } = await params
  const supabase = await createClient()

  // Check non-viewer role
  const { data: email } = await supabase
    .from("emails")
    .select("id, subject, body_text, sender_address, competitor_id, org_id")
    .eq("id", id)
    .single()

  if (!email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", email.org_id)
    .eq("user_id", user!.id)
    .single()

  if (membership?.role === "VIEWER") {
    return NextResponse.json({ error: "Viewers cannot re-analyze" }, { status: 403 })
  }

  // Fetch competitor name
  const { data: competitor } = await supabase
    .from("competitors")
    .select("name")
    .eq("id", email.competitor_id)
    .single()

  // Fetch org categories
  const { data: categories } = await supabase
    .from("categories")
    .select("name")
    .eq("org_id", email.org_id)
  const categoryNames = (categories || []).map((c) => c.name)

  const aiResult = await analyzeEmail({
    subject: email.subject,
    bodyText: email.body_text,
    senderAddress: email.sender_address,
    competitorName: competitor?.name || "Unknown",
    categoryNames,
  })

  if (!aiResult) {
    return NextResponse.json(
      { error: "AI analysis failed. Check that OPENAI_API_KEY is configured." },
      { status: 500 }
    )
  }

  await supabase
    .from("emails")
    .update({
      ai_summary: aiResult.summary,
      ai_category: aiResult.category,
      ai_tags: aiResult.tags,
      ai_sentiment: aiResult.sentiment,
      ai_processed_at: new Date().toISOString(),
    })
    .eq("id", id)

  return NextResponse.json({
    aiSummary: aiResult.summary,
    aiCategory: aiResult.category,
    aiTags: aiResult.tags,
    aiSentiment: aiResult.sentiment,
    aiProcessedAt: new Date().toISOString(),
  })
}
