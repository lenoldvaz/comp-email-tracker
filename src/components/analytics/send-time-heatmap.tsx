"use client"

import { useQuery } from "@tanstack/react-query"

interface HeatmapPoint {
  dayOfWeek: number
  hourOfDay: number
  count: number
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function getColor(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return "bg-gray-50"
  const intensity = count / maxCount
  if (intensity > 0.75) return "bg-blue-600"
  if (intensity > 0.5) return "bg-blue-400"
  if (intensity > 0.25) return "bg-blue-300"
  return "bg-blue-100"
}

function getTextColor(count: number, maxCount: number): string {
  if (maxCount === 0 || count === 0) return "text-gray-300"
  const intensity = count / maxCount
  return intensity > 0.5 ? "text-white" : "text-gray-600"
}

export function SendTimeHeatmap({ filterQuery }: { filterQuery: string }) {
  // Pass the user's timezone offset so the API can convert
  const tzOffset = new Date().getTimezoneOffset()
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

  const { data } = useQuery<HeatmapPoint[]>({
    queryKey: ["analytics-send-times", filterQuery, tz],
    queryFn: () =>
      fetch(`/api/analytics/send-times?tz=${encodeURIComponent(tz)}${filterQuery ? `&${filterQuery}` : ""}`).then(
        (r) => r.json()
      ),
  })

  // Build a 7x24 grid
  const grid = new Map<string, number>()
  let maxCount = 0
  let totalEmails = 0

  const safeData = Array.isArray(data) ? data : []
  safeData.forEach((point) => {
    const key = `${point.dayOfWeek}-${point.hourOfDay}`
    grid.set(key, point.count)
    if (point.count > maxCount) maxCount = point.count
    totalEmails += point.count
  })

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Send Time Heatmap</h2>
        <span className="text-xs text-gray-400">{tz} ({totalEmails} emails)</span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Hour labels */}
          <div className="flex">
            <div className="w-10 shrink-0" />
            {HOURS.map((h) => (
              <div key={h} className="flex-1 text-center text-[10px] text-gray-400">
                {h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`}
              </div>
            ))}
          </div>
          {/* Grid rows */}
          {DAYS.map((day, dayIdx) => (
            <div key={day} className="flex items-center">
              <div className="w-10 shrink-0 text-xs text-gray-500 pr-2 text-right">
                {day}
              </div>
              {HOURS.map((hour) => {
                const count = grid.get(`${dayIdx}-${hour}`) || 0
                return (
                  <div
                    key={hour}
                    className={`flex-1 aspect-square m-[1px] rounded-sm flex items-center justify-center ${getColor(count, maxCount)}`}
                    title={`${day} ${hour}:00 - ${count} emails`}
                  >
                    <span className={`text-[8px] ${getTextColor(count, maxCount)}`}>
                      {count > 0 ? count : ""}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <span>Less</span>
        <div className="h-3 w-3 rounded-sm bg-gray-50 border" />
        <div className="h-3 w-3 rounded-sm bg-blue-100" />
        <div className="h-3 w-3 rounded-sm bg-blue-300" />
        <div className="h-3 w-3 rounded-sm bg-blue-400" />
        <div className="h-3 w-3 rounded-sm bg-blue-600" />
        <span>More</span>
      </div>
    </div>
  )
}
