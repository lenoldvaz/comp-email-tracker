"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { EmailList } from "@/components/emails/email-list"
import { EmailPreview } from "@/components/emails/email-preview"
import { useState } from "react"

interface Competitor {
  id: string
  name: string
  domains: string[]
  colourHex: string | null
  _count: { emails: number }
}

export default function CompetitorProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: competitor } = useQuery<Competitor>({
    queryKey: ["competitor", id],
    queryFn: () => fetch(`/api/competitors/${id}`).then((r) => r.json()),
  })

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <Link
          href="/competitors"
          className="mb-2 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          All competitors
        </Link>
        {competitor && (
          <div className="flex items-center gap-3">
            {competitor.colourHex && (
              <span
                className="inline-block h-5 w-5 rounded-full"
                style={{ backgroundColor: competitor.colourHex }}
              />
            )}
            <h1 className="text-xl font-bold">{competitor.name}</h1>
            <span className="text-sm text-gray-400">
              {competitor.domains.join(", ")}
            </span>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-sm text-gray-600">
              {competitor._count.emails} emails
            </span>
          </div>
        )}
      </div>

      {/* Email list for this competitor */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-full flex-col border-r lg:w-2/5">
          <EmailList selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="hidden flex-1 lg:block">
          {selectedId ? (
            <EmailPreview emailId={selectedId} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Select an email to preview
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
