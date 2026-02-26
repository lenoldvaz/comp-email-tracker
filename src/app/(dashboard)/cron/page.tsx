"use client"

import { Suspense, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSearchParams, useRouter } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils/cn"
import { useOrg } from "../org-context"
import { describeCron, getNextRun } from "@/lib/utils/cron"
import { Play, Save, ChevronDown } from "lucide-react"

// -- Types --

interface CronRun {
  id: string
  org_id: string
  status: string
  trigger: string
  started_at: string
  finished_at: string | null
  emails_processed: number
  emails_duplicates: number
  emails_failed: number
  error_message: string | null
  duration_ms: number | null
}

interface RunsResponse {
  runs: CronRun[]
  total: number
  page: number
  pageSize: number
  stats: {
    successRate: number | null
    avgDuration: number | null
  }
}

interface CronSettings {
  org_id: string
  schedule: string
  enabled: boolean
  notify_on_failure: boolean
  notify_email: string | null
}

// -- Status badges --

const statusColors: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  running: "bg-blue-100 text-blue-700",
}

const triggerColors: Record<string, string> = {
  cron: "bg-gray-100 text-gray-600",
  manual: "bg-purple-100 text-purple-700",
}

// -- Schedule presets --

const SCHEDULE_PRESETS = [
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily at 8 AM UTC", value: "0 8 * * *" },
  { label: "Daily at midnight UTC", value: "0 0 * * *" },
  { label: "Custom", value: "custom" },
]

function formatDuration(ms: number | null): string {
  if (ms === null) return "—"
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}

// -- Main Content --

function CronMonitorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { orgId } = useOrg()

  const statusFilter = searchParams.get("status") || ""
  const page = parseInt(searchParams.get("page") || "1", 10)

  // Fetch runs
  const { data, isLoading } = useQuery<RunsResponse>({
    queryKey: ["cron-runs", orgId, statusFilter, page],
    queryFn: () => {
      const params = new URLSearchParams({ orgId })
      if (statusFilter) params.set("status", statusFilter)
      params.set("page", String(page))
      return fetch(`/api/cron/runs?${params}`).then((r) => r.json())
    },
    enabled: !!orgId,
  })

  // Fetch settings
  const { data: settings } = useQuery<CronSettings>({
    queryKey: ["cron-settings", orgId],
    queryFn: () =>
      fetch(`/api/cron/settings?orgId=${orgId}`).then((r) => r.json()),
    enabled: !!orgId,
  })

  // Run now mutation
  const runNow = useMutation({
    mutationFn: () =>
      fetch("/api/ingestion/trigger", { method: "POST" }).then((r) => {
        if (!r.ok) throw new Error("Trigger failed")
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cron-runs"] })
    },
  })

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0
  const lastRun = data?.runs?.[0]
  const schedule = settings?.schedule || "0 8 * * *"
  const nextRun = getNextRun(schedule)

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cron Monitor</h1>
        <button
          onClick={() => runNow.mutate()}
          disabled={runNow.isPending}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          {runNow.isPending ? "Running..." : "Run Now"}
        </button>
      </div>

      {/* Health Overview Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Last Run */}
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs font-medium text-gray-500">Last Run</div>
          {lastRun ? (
            <>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-xs font-medium",
                    statusColors[lastRun.status] || "bg-gray-100"
                  )}
                >
                  {lastRun.status}
                </span>
              </div>
              <div className="mt-1 text-sm text-gray-600">
                {formatDistanceToNow(new Date(lastRun.started_at), { addSuffix: true })}
              </div>
            </>
          ) : (
            <div className="mt-1 text-sm text-gray-400">No runs yet</div>
          )}
        </div>

        {/* Next Run */}
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs font-medium text-gray-500">Next Run</div>
          <div className="mt-1 text-sm font-medium">
            {format(nextRun, "MMM d, h:mm a")}
          </div>
          <div className="mt-1 text-sm text-gray-600">
            {formatDistanceToNow(nextRun, { addSuffix: true })}
          </div>
        </div>

        {/* Success Rate */}
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs font-medium text-gray-500">Success Rate</div>
          <div className="mt-1 text-lg font-semibold">
            {data?.stats.successRate !== null && data?.stats.successRate !== undefined
              ? `${data.stats.successRate}%`
              : "—"}
          </div>
          <div className="mt-1 text-xs text-gray-400">Last 30 runs</div>
        </div>

        {/* Avg Duration */}
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs font-medium text-gray-500">Avg Duration</div>
          <div className="mt-1 text-lg font-semibold">
            {formatDuration(data?.stats.avgDuration ?? null)}
          </div>
          <div className="mt-1 text-xs text-gray-400">Last 30 runs</div>
        </div>
      </div>

      {/* Run History */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Run History</h2>

        {/* Status filter */}
        <div className="mb-4 flex gap-2">
          {["", "success", "failed", "running"].map((s) => (
            <button
              key={s}
              onClick={() => {
                const params = new URLSearchParams()
                if (s) params.set("status", s)
                router.push(`/cron?${params}`)
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                (statusFilter || "") === s
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-500 hover:bg-gray-100"
              )}
            >
              {s || "All"}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Trigger</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Processed</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Dup</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Failed</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Duration</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Error</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="h-5 animate-pulse rounded bg-gray-100" />
                      </td>
                    </tr>
                  ))
                : data?.runs.length === 0
                  ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                        No runs found
                      </td>
                    </tr>
                  )
                  : data?.runs.map((run) => (
                    <tr key={run.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-gray-600">
                        {format(new Date(run.started_at), "MMM d, h:mm:ss a")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-xs font-medium",
                            triggerColors[run.trigger] || "bg-gray-100"
                          )}
                        >
                          {run.trigger}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-xs font-medium",
                            statusColors[run.status] || "bg-gray-100"
                          )}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{run.emails_processed}</td>
                      <td className="px-4 py-3 text-gray-600">{run.emails_duplicates}</td>
                      <td className="px-4 py-3 text-gray-600">{run.emails_failed}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDuration(run.duration_ms)}</td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-red-600">
                        {run.error_message || "—"}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-gray-500">{data?.total} runs</span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString())
                  params.set("page", String(page - 1))
                  router.push(`/cron?${params}`)
                }}
                className="rounded border px-2 py-1 text-xs disabled:opacity-50"
              >
                Prev
              </button>
              <span className="px-2 py-1 text-xs text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString())
                  params.set("page", String(page + 1))
                  router.push(`/cron?${params}`)
                }}
                className="rounded border px-2 py-1 text-xs disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settings Section */}
      <SettingsPanel orgId={orgId} settings={settings} />
    </div>
  )
}

// -- Settings Panel --

function SettingsPanel({ orgId, settings }: { orgId: string; settings?: CronSettings }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [schedule, setSchedule] = useState(settings?.schedule || "0 8 * * *")
  const [customSchedule, setCustomSchedule] = useState("")
  const [enabled, setEnabled] = useState(settings?.enabled ?? true)
  const [notifyOnFailure, setNotifyOnFailure] = useState(settings?.notify_on_failure ?? false)
  const [notifyEmail, setNotifyEmail] = useState(settings?.notify_email || "")

  // Sync state when settings load
  const settingsKey = settings ? `${settings.schedule}-${settings.enabled}-${settings.notify_on_failure}-${settings.notify_email}` : ""
  useState(() => {
    if (settings) {
      setSchedule(settings.schedule)
      setEnabled(settings.enabled)
      setNotifyOnFailure(settings.notify_on_failure)
      setNotifyEmail(settings.notify_email || "")
    }
  })

  const isPreset = SCHEDULE_PRESETS.some((p) => p.value === schedule && p.value !== "custom")
  const activePreset = isPreset ? schedule : "custom"
  const displaySchedule = activePreset === "custom" ? schedule : schedule

  const saveMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/cron/settings?orgId=${orgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedule: activePreset === "custom" ? customSchedule || schedule : schedule,
          enabled,
          notify_on_failure: notifyOnFailure,
          notify_email: notifyEmail || null,
        }),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to save settings")
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cron-settings"] })
    },
  })

  // Suppress unused variable warning
  void settingsKey

  return (
    <div className="rounded-lg border bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <h2 className="text-lg font-semibold">Settings</h2>
        <ChevronDown
          className={cn("h-4 w-4 text-gray-400 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t px-4 py-4 space-y-4">
          {/* Schedule */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label>
            <select
              value={activePreset}
              onChange={(e) => {
                const val = e.target.value
                if (val === "custom") {
                  setCustomSchedule(schedule)
                } else {
                  setSchedule(val)
                }
              }}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {SCHEDULE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            {activePreset === "custom" && (
              <div className="mt-2">
                <input
                  type="text"
                  value={customSchedule}
                  onChange={(e) => {
                    setCustomSchedule(e.target.value)
                    setSchedule(e.target.value)
                  }}
                  placeholder="0 8 * * *"
                  className="w-full rounded-md border px-3 py-2 text-sm font-mono"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {describeCron(customSchedule || schedule)}
                </p>
              </div>
            )}
            {activePreset !== "custom" && (
              <p className="mt-1 text-xs text-gray-500">{describeCron(schedule)}</p>
            )}
          </div>

          {/* Enabled */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
            </label>
            <span className="text-sm text-gray-700">Cron enabled</span>
          </div>

          {/* Failure notifications */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={notifyOnFailure}
                  onChange={(e) => setNotifyOnFailure(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
              </label>
              <span className="text-sm text-gray-700">Notify on failure</span>
            </div>
            {notifyOnFailure && (
              <input
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            )}
          </div>

          <p className="text-xs text-gray-400">
            Note: Schedule changes require updating vercel.json for Vercel-hosted crons.
          </p>

          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </button>

          {saveMutation.isSuccess && (
            <p className="text-sm text-green-600">Settings saved.</p>
          )}
          {saveMutation.isError && (
            <p className="text-sm text-red-600">Failed to save settings.</p>
          )}
        </div>
      )}
    </div>
  )
}

// -- Page Export --

export default function CronMonitorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      }
    >
      <CronMonitorContent />
    </Suspense>
  )
}
