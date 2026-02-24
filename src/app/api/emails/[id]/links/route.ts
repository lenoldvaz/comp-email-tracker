import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import { z } from "zod"

const schema = z.object({
  urls: z.array(z.string().url()).max(200),
})

async function checkUrl(url: string): Promise<{ url: string; status: number | null; error: string | null }> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    })
    return { url, status: res.status, error: null }
  } catch (err) {
    return { url, status: null, error: err instanceof Error ? err.message : "Failed" }
  }
}

export async function POST(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const results: { url: string; status: number | null; error: string | null }[] = []

  // Process in batches of 10
  for (let i = 0; i < parsed.data.urls.length; i += 10) {
    const batch = parsed.data.urls.slice(i, i + 10)
    const batchResults = await Promise.allSettled(batch.map(checkUrl))
    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        results.push(r.value)
      } else {
        results.push({ url: batch[results.length % batch.length], status: null, error: "Request failed" })
      }
    }
  }

  return NextResponse.json({ results })
}
