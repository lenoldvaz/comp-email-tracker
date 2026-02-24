import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import { z } from "zod"

const schema = z.object({
  urls: z.array(z.string().url()).max(200),
})

async function checkImage(url: string): Promise<{
  url: string
  loaded: boolean
  contentType: string | null
  size: number | null
}> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    })
    return {
      url,
      loaded: res.ok,
      contentType: res.headers.get("content-type"),
      size: res.headers.has("content-length")
        ? parseInt(res.headers.get("content-length")!, 10)
        : null,
    }
  } catch {
    return { url, loaded: false, contentType: null, size: null }
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

  const results: { url: string; loaded: boolean; contentType: string | null; size: number | null }[] = []

  for (let i = 0; i < parsed.data.urls.length; i += 10) {
    const batch = parsed.data.urls.slice(i, i + 10)
    const batchResults = await Promise.allSettled(batch.map(checkImage))
    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        results.push(r.value)
      } else {
        results.push({ url: batch[results.length % batch.length], loaded: false, contentType: null, size: null })
      }
    }
  }

  return NextResponse.json({ results })
}
