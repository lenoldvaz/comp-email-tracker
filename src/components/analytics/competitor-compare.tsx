"use client"

import { useQuery } from "@tanstack/react-query"
import { useOrg } from "@/app/(dashboard)/org-context"
import { useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { format } from "date-fns"

const COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"]

interface VolumePoint {
  period: string
  competitorName: string
  colourHex: string | null
  count: number
}

interface FrequencyRow {
  id: string
  name: string
  colourHex: string | null
  total: number
  avgPerMonth: number
  lastEmailDate: string | null
}

interface Competitor {
  id: string
  name: string
  colour_hex: string | null
}

export function CompetitorCompare({ dateQuery }: { dateQuery: string }) {
  const { orgId } = useOrg()
  const [selected, setSelected] = useState<string[]>([])

  const { data: competitors } = useQuery<Competitor[]>({
    queryKey: ["competitors", orgId],
    queryFn: () => fetch(`/api/competitors?orgId=${orgId}`).then((r) => r.json()),
    enabled: !!orgId,
  })

  const { data: volumeData } = useQuery<VolumePoint[]>({
    queryKey: ["analytics-volume", "month", dateQuery],
    queryFn: () =>
      fetch(
        `/api/analytics/volume?granularity=month${dateQuery ? `&${dateQuery}` : ""}`
      ).then((r) => r.json()),
  })

  const { data: frequencyData } = useQuery<FrequencyRow[]>({
    queryKey: ["analytics-frequency", dateQuery],
    queryFn: () =>
      fetch(`/api/analytics/frequency${dateQuery ? `?${dateQuery}` : ""}`).then(
        (r) => r.json()
      ),
  })

  const toggleCompetitor = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 4
          ? [...prev, id]
          : prev
    )
  }

  const safeCompetitors = Array.isArray(competitors) ? competitors : []
  const selectedCompetitors = safeCompetitors.filter((c) => selected.includes(c.id))
  const selectedNames = new Set(selectedCompetitors.map((c) => c.name))

  // Filter volume data
  const safeVolumeData = Array.isArray(volumeData) ? volumeData : []
  const filteredVolume = safeVolumeData.filter(
    (p) => selectedNames.has(p.competitorName)
  )

  // Pivot for recharts
  const volumeByPeriod = new Map<string, Record<string, number>>()
  const compColors = new Map<string, string>()

  filteredVolume.forEach((point) => {
    const key = format(new Date(point.period), "MMM yyyy")
    if (!volumeByPeriod.has(key)) volumeByPeriod.set(key, {})
    volumeByPeriod.get(key)![point.competitorName] = point.count
    if (point.colourHex) compColors.set(point.competitorName, point.colourHex)
  })

  const chartData = Array.from(volumeByPeriod.entries()).map(
    ([period, counts]) => ({ period, ...counts })
  )

  // Comparison stats
  const stats = selectedCompetitors.map((c) => {
    const safeFreq = Array.isArray(frequencyData) ? frequencyData : []
    const freq = safeFreq.find((f) => f.id === c.id)
    return {
      name: c.name,
      total: freq?.total || 0,
      avgPerMonth: freq?.avgPerMonth || 0,
      lastEmail: freq?.lastEmailDate,
    }
  })

  return (
    <div className="rounded-lg border bg-white p-6">
      <h2 className="mb-4 font-semibold">Competitor Comparison</h2>

      {/* Competitor picker */}
      <div className="mb-4 flex flex-wrap gap-2">
        {safeCompetitors.map((c) => (
          <button
            key={c.id}
            onClick={() => toggleCompetitor(c.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              selected.includes(c.id)
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-300 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {c.name}
          </button>
        ))}
        {selected.length === 0 && (
          <span className="text-xs text-gray-400">Select 2-4 competitors to compare</span>
        )}
      </div>

      {selected.length >= 2 && (
        <>
          {/* Stats cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <div key={s.name} className="rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: compColors.get(s.name) || COLORS[i % COLORS.length] }}
                  />
                  <span className="text-sm font-medium truncate">{s.name}</span>
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Total emails</span>
                    <span className="font-medium text-gray-900">{s.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg/month</span>
                    <span className="font-medium text-gray-900">{s.avgPerMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last email</span>
                    <span className="font-medium text-gray-900">
                      {s.lastEmail ? format(new Date(s.lastEmail), "MMM d") : "---"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Overlay chart */}
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {selectedCompetitors.map((c, i) => (
                <Line
                  key={c.id}
                  type="monotone"
                  dataKey={c.name}
                  stroke={compColors.get(c.name) || COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
}
