import { createServiceClient } from "@/lib/supabase/server"

interface CompetitorDomainMap {
  competitorId: string
  domain: string
}

let cachedDomains: CompetitorDomainMap[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getCompetitorDomains(): Promise<CompetitorDomainMap[]> {
  if (cachedDomains && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedDomains
  }

  const supabase = createServiceClient()
  const { data: competitors } = await supabase
    .from("competitors")
    .select("id, domains")

  cachedDomains = (competitors || []).flatMap((c: { id: string; domains: string[] }) =>
    c.domains.map((domain: string) => ({
      competitorId: c.id,
      domain: domain.toLowerCase(),
    }))
  )
  cacheTimestamp = Date.now()
  return cachedDomains!
}

export function invalidateCompetitorCache() {
  cachedDomains = null
}

export async function getCompetitorDomainList(): Promise<string[]> {
  const domains = await getCompetitorDomains()
  return [...new Set(domains.map((d) => d.domain))]
}

export async function detectCompetitor(senderAddress: string): Promise<string | null> {
  const domains = await getCompetitorDomains()
  const senderDomain = senderAddress.split("@")[1]?.toLowerCase()
  if (!senderDomain) return null

  // Exact match first
  const exact = domains.find((d) => d.domain === senderDomain)
  if (exact) return exact.competitorId

  // Subdomain match (e.g., mail.competitor.com matches competitor.com)
  const subdomain = domains.find((d) => senderDomain.endsWith(`.${d.domain}`))
  if (subdomain) return subdomain.competitorId

  return null
}
