"use client"

import { useQuery } from "@tanstack/react-query"
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
import { AlertTriangle, TrendingUp } from "lucide-react"

const COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"]

interface TrendPoint {
  competitorId: string
  competitorName: string
  colourHex: string | null
  weekStart: string
  count: number
  prevWeekCount: number
  wowChange: number | null
}

export function TrendsAlerts() {
  const { data } = useQuery<TrendPoint[]>({
    queryKey: ["analytics-trends"],
    queryFn: () => fetch("/api/analytics/trends").then((r) => r.json()),
  })

  if (!data || !Array.isArray(data) || data.length === 0) return null

  // Build chart data: pivot by week
  const weekMap = new Map<string, Record<string, number>>()
  const competitors = new Set<string>()
  const compColors = new Map<string, string>()

  data.forEach((point) => {
    const key = format(new Date(point.weekStart), "MMM d")
    if (!weekMap.has(key)) weekMap.set(key, {})
    weekMap.get(key)![point.competitorName] = point.count
    competitors.add(point.competitorName)
    if (point.colourHex) compColors.set(point.competitorName, point.colourHex)
  })

  const chartData = Array.from(weekMap.entries())
    .map(([week, counts]) => ({ week, ...counts }))
    .reverse() // chronological order

  const competitorList = Array.from(competitors)

  // Find alerts: most recent week with significant WoW increase
  const latestWeek = data.reduce((max, p) =>
    new Date(p.weekStart) > new Date(max) ? p.weekStart : max,
    data[0].weekStart
  )

  const alerts = data
    .filter((p) => p.weekStart === latestWeek && p.wowChange !== null && p.wowChange > 50)
    .sort((a, b) => (b.wowChange || 0) - (a.wowChange || 0))

  return (
    <div className="rounded-lg border bg-white p-6">
      <h2 className="mb-4 font-semibold">Trends & Alerts</h2>

      {/* Alert cards */}
      {alerts.length > 0 && (
        <div className="mb-4 space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.competitorId}
              className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <div className="flex-1 text-sm">
                <span className="font-medium">{alert.competitorName}</span> sent{" "}
                <span className="font-medium text-amber-700">
                  +{alert.wowChange}%
                </span>{" "}
                more emails this week ({alert.count} vs {alert.prevWeekCount} last week)
              </div>
              <TrendingUp className="h-4 w-4 text-amber-600 shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Weekly trend chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {competitorList.map((name, i) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={compColors.get(name) || COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
