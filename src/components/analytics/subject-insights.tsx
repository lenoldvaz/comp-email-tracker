"use client"

import { useQuery } from "@tanstack/react-query"

interface SubjectInsight {
  competitorId: string
  competitorName: string
  avgLength: number
  emojiCount: number
  questionCount: number
  totalEmails: number
}

export function SubjectInsights({ dateQuery }: { dateQuery: string }) {
  const { data } = useQuery<SubjectInsight[]>({
    queryKey: ["analytics-subjects", dateQuery],
    queryFn: () =>
      fetch(`/api/analytics/subjects${dateQuery ? `?${dateQuery}` : ""}`).then(
        (r) => r.json()
      ),
  })

  if (!data || !Array.isArray(data) || data.length === 0) return null

  return (
    <div className="rounded-lg border bg-white p-6">
      <h2 className="mb-4 font-semibold">Subject Line Insights</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Competitor</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Avg Length</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Has Emoji %</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Has Question %</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.competitorId} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{row.competitorName}</td>
                <td className="px-4 py-3 text-right">
                  {row.avgLength} <span className="text-gray-400">chars</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {row.totalEmails > 0
                    ? Math.round((row.emojiCount / row.totalEmails) * 100)
                    : 0}%
                </td>
                <td className="px-4 py-3 text-right">
                  {row.totalEmails > 0
                    ? Math.round((row.questionCount / row.totalEmails) * 100)
                    : 0}%
                </td>
                <td className="px-4 py-3 text-right font-medium">{row.totalEmails}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
