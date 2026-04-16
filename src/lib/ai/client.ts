import OpenAI from "openai"

interface AnalyzeEmailInput {
  subject: string
  bodyText: string | null
  senderAddress: string
  competitorName: string
  categoryNames: string[]
}

interface AnalyzeEmailResult {
  summary: string
  category: string
  tags: string[]
  sentiment: "positive" | "neutral" | "negative"
}

const MAX_BODY_LENGTH = 3000

export async function analyzeEmail(
  input: AnalyzeEmailInput
): Promise<AnalyzeEmailResult | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const openai = new OpenAI({ apiKey })

  const body = input.bodyText
    ? input.bodyText.slice(0, MAX_BODY_LENGTH)
    : "(no body text)"

  const categoryList =
    input.categoryNames.length > 0
      ? input.categoryNames.join(", ")
      : "none defined"

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You analyze marketing emails from competitors. Return valid JSON only.`,
        },
        {
          role: "user",
          content: `You are analyzing a marketing email from ${input.competitorName} (${input.senderAddress}).

Subject: ${input.subject}
Body: ${body}

Existing categories: ${categoryList}

Choose tags from this established vocabulary (pick all that apply, max 5):
- promotion: broad offer or incentive language
- discount: specific dollar/percent savings ("$X off", "save $", "lowest price ever")
- free visit: "free visit", "$0 visit", "no promo code required"
- limited time: urgency language ("hurry", "final hours", "countdown", "ends soon", "deadline")
- weight loss: weight loss treatments, GLP-1 medications, semaglutide, tirzepatide, Ozempic
- referral program: "refer a friend", "invite friends", referral incentives
- contest: prize draws, competitions, winner announcements
- prizes: specific prizes mentioned (Apple Watch, gift cards, cash)
- rewards: points, loyalty rewards, earning incentives
- id upload: "upload your ID", photo ID, health card, passport, driver's license required
- abandoned: re-engagement after inactivity ("still waiting", "don't forget", "pick up where you left off", "reminder")
- wellness: general health/lifestyle framing, not tied to a specific treatment
- longevity: mentions of longevity program or longevity testing
- new year: New Year's messaging, "Day One", January seasonal
- black friday: Black Friday or Cyber Monday seasonal
- treatment: specific medical treatment being offered or explained
- consultation: booking or completing a medical consultation
- support: customer support, health coaching, ongoing care
- community: social proof, testimonials, patient stories
- prescription: prescription medication, refills, dosage
- mobile app: app download or app feature promotion
- personalized care: personalized/tailored treatment plans
- medical weight loss: clinical/medical framing of weight loss specifically

Only use a tag from outside this list if nothing fits. Return JSON:
{
  "summary": "2-3 sentence summary of the email's purpose and key message",
  "category": "best matching category from the existing categories list, or 'Uncategorized' if none fit",
  "tags": ["tags chosen from vocabulary above, max 5"],
  "sentiment": "positive|neutral|negative"
}`,
        },
      ],
    })

    const content = response.choices[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content) as {
      summary?: string
      category?: string
      tags?: string[]
      sentiment?: string
    }

    if (!parsed.summary || !parsed.category || !parsed.tags || !parsed.sentiment) {
      return null
    }

    const sentiment = parsed.sentiment as string
    if (!["positive", "neutral", "negative"].includes(sentiment)) {
      return null
    }

    return {
      summary: parsed.summary,
      category: parsed.category,
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
      sentiment: sentiment as "positive" | "neutral" | "negative",
    }
  } catch (err) {
    console.error("AI analysis failed:", err instanceof Error ? err.message : err)
    return null
  }
}
