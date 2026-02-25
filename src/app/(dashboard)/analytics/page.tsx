"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { format } from "date-fns"
import { Download } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { SendTimeHeatmap } from "@/components/analytics/send-time-heatmap"
import { SubjectInsights } from "@/components/analytics/subject-insights"
import { CompetitorCompare } from "@/components/analytics/competitor-compare"
import { TrendsAlerts } from "@/components/analytics/trends-alerts"
import { useOrg } from "../org-context"

const COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#6366F1", "#14B8A6"]

interface Competitor {
  id: string
  name: string
}

interface VolumePoint {
  period: string
  competitorName: string
  colourHex: string | null
  count: number
}

interface CategoryPoint {
  name: string
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

interface TagCount {
  name: string
  count: number
}

export default function AnalyticsPage() {
  const { orgId } = useOrg()
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [competitorId, setCompetitorId] = useState("")
  const [granularity, setGranularity] = useState<"week" | "month">("month")

  const filterParams = new URLSearchParams()
  if (dateFrom) filterParams.set("dateFrom", dateFrom)
  if (dateTo) filterParams.set("dateTo", dateTo)
  if (competitorId) filterParams.set("competitorId", competitorId)
  const filterQuery = filterParams.toString()

  // Date-only params (for endpoints that don't support competitorId)
  const dateParams = new URLSearchParams()
  if (dateFrom) dateParams.set("dateFrom", dateFrom)
  if (dateTo) dateParams.set("dateTo", dateTo)
  const dateQuery = dateParams.toString()

  const { data: competitorsList } = useQuery<Competitor[]>({
    queryKey: ["competitors", orgId],
    queryFn: () => fetch(`/api/competitors?orgId=${orgId}`).then((r) => r.json()),
    enabled: !!orgId,
  })

  const { data: volumeData } = useQuery<VolumePoint[]>({
    queryKey: ["analytics-volume", granularity, filterQuery],
    queryFn: () =>
      fetch(
        `/api/analytics/volume?granularity=${granularity}${filterQuery ? `&${filterQuery}` : ""}`
      ).then((r) => r.json()),
  })

  const { data: categoryData } = useQuery<CategoryPoint[]>({
    queryKey: ["analytics-categories", filterQuery],
    queryFn: () =>
      fetch(`/api/analytics/categories${filterQuery ? `?${filterQuery}` : ""}`).then(
        (r) => r.json()
      ),
  })

  const { data: frequencyData } = useQuery<FrequencyRow[]>({
    queryKey: ["analytics-frequency", dateQuery],
    queryFn: () =>
      fetch(`/api/analytics/frequency${dateQuery ? `?${dateQuery}` : ""}`).then(
        (r) => r.json()
      ),
  })

  const { data: tagData } = useQuery<TagCount[]>({
    queryKey: ["analytics-tags", dateQuery],
    queryFn: () =>
      fetch(`/api/analytics/tags${dateQuery ? `?${dateQuery}` : ""}`).then(
        (r) => r.json()
      ),
  })

  // Transform volume data for recharts (pivot by competitor)
  const volumeByPeriod = new Map<string, Record<string, number>>()
  const competitors = new Set<string>()
  const competitorColors = new Map<string, string>()

  const safeVolumeData = Array.isArray(volumeData) ? volumeData : []
  safeVolumeData.forEach((point) => {
    const key = format(new Date(point.period), granularity === "week" ? "MMM d" : "MMM yyyy")
    if (!volumeByPeriod.has(key)) volumeByPeriod.set(key, {})
    volumeByPeriod.get(key)![point.competitorName] = point.count
    competitors.add(point.competitorName)
    if (point.colourHex) competitorColors.set(point.competitorName, point.colourHex)
  })

  const volumeChartData = Array.from(volumeByPeriod.entries()).map(
    ([period, counts]) => ({ period, ...counts })
  )
  const competitorList = Array.from(competitors)

  const hasFilters = dateFrom || dateTo || competitorId

  function exportFrequencyCsv() {
    if (!frequencyData || !Array.isArray(frequencyData)) return
    const header = "Competitor,Total Emails,Avg / Month,Last Email"
    const rows = frequencyData.map((r) =>
      [r.name, r.total, r.avgPerMonth, r.lastEmailDate || ""].join(",")
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `competitor-frequency-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const safeCompetitors = Array.isArray(competitorsList) ? competitorsList : []

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {/* Global filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={competitorId}
          onChange={(e) => setCompetitorId(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All competitors</option>
          {safeCompetitors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="h-5 border-l border-gray-200" />

        <label className="text-sm text-gray-500">From</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <label className="text-sm text-gray-500">to</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        {hasFilters && (
          <button
            onClick={() => {
              setDateFrom("")
              setDateTo("")
              setCompetitorId("")
            }}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Volume over time */}
      <div className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Email Volume Over Time</h2>
          <div className="flex gap-1">
            <button
              onClick={() => setGranularity("week")}
              className={`rounded px-3 py-1 text-xs ${granularity === "week" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setGranularity("month")}
              className={`rounded px-3 py-1 text-xs ${granularity === "month" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}
            >
              Monthly
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={volumeChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {competitorList.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={competitorColors.get(name) || COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category distribution */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 font-semibold">Emails by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Array.isArray(categoryData) ? categoryData : []}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name} (${value})`}
              >
                {(Array.isArray(categoryData) ? categoryData : []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category bar chart */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 font-semibold">Category Breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Array.isArray(categoryData) ? categoryData : []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Tags */}
      {Array.isArray(tagData) && tagData.length > 0 && (
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 font-semibold">Top Tags</h2>
          <ResponsiveContainer width="100%" height={Math.max(200, tagData.length * 32)}>
            <BarChart data={tagData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Competitor frequency table */}
      <div className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Competitor Send Frequency</h2>
          <button
            onClick={exportFrequencyCsv}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
            title="Export as CSV"
          >
            <Download className="h-3 w-3" />
            Export
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Competitor
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">
                  Total Emails
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">
                  Avg / Month
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">
                  Last Email
                </th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(frequencyData) ? frequencyData : []).map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {row.colourHex && (
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: row.colourHex }}
                        />
                      )}
                      {row.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {row.total}
                  </td>
                  <td className="px-4 py-3 text-right">{row.avgPerMonth}</td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {row.lastEmailDate
                      ? format(new Date(row.lastEmailDate), "MMM d, yyyy")
                      : "---"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send-time heatmap */}
      <SendTimeHeatmap filterQuery={filterQuery} />

      {/* Subject line insights */}
      <SubjectInsights dateQuery={dateQuery} />

      {/* Competitor comparison */}
      <CompetitorCompare dateQuery={dateQuery} />

      {/* Trends & Alerts */}
      <TrendsAlerts />
    </div>
  )
}
