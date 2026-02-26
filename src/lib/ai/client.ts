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

Return JSON with exactly these fields:
{
  "summary": "2-3 sentence summary of the email's purpose and key message",
  "category": "best matching category from the existing categories list, or 'Uncategorized' if none fit",
  "tags": ["up to 5 relevant tags as lowercase words/phrases"],
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
