"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { toast } from "sonner"
import { Mail, RefreshCw, Unplug, Plug } from "lucide-react"

interface GmailStatus {
  connected: boolean
  email: string | null
  lastSyncAt: string | null
}

export default function SettingsPage() {
  const queryClient = useQueryClient()

  const { data: gmailStatus, isLoading } = useQuery<GmailStatus>({
    queryKey: ["gmail-status"],
    queryFn: () => fetch("/api/settings/gmail").then((r) => r.json()),
  })

  const connectMutation = useMutation({
    mutationFn: () =>
      fetch("/api/settings/gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect" }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    },
    onError: () => toast.error("Failed to initiate Gmail connection"),
  })

  const disconnectMutation = useMutation({
    mutationFn: () =>
      fetch("/api/settings/gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail-status"] })
      toast.success("Gmail disconnected")
    },
  })

  const syncMutation = useMutation({
    mutationFn: () =>
      fetch("/api/ingestion/trigger", { method: "POST" }).then((r) =>
        r.json()
      ),
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success(
          `Sync complete: ${data.processed} processed, ${data.duplicates} duplicates, ${data.failed} failed`
        )
        queryClient.invalidateQueries({ queryKey: ["gmail-status"] })
        queryClient.invalidateQueries({ queryKey: ["emails"] })
      }
    },
    onError: () => toast.error("Sync failed"),
  })

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      {/* Gmail Connection */}
      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold">Gmail Connection</h2>
        </div>

        {isLoading ? (
          <div className="h-20 animate-pulse rounded bg-gray-100" />
        ) : gmailStatus?.connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-green-700">Connected</span>
            </div>
            <div className="text-sm text-gray-600">
              <p>Monitoring: <span className="font-medium">{gmailStatus.email}</span></p>
              {gmailStatus.lastSyncAt && (
                <p>Last sync: {format(new Date(gmailStatus.lastSyncAt), "MMM d, yyyy h:mm a")}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                {syncMutation.isPending ? "Syncing..." : "Sync Now"}
              </button>
              <button
                onClick={() => {
                  if (confirm("Disconnect Gmail?")) {
                    disconnectMutation.mutate()
                  }
                }}
                className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Unplug className="h-4 w-4" />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="text-sm text-gray-500">Not connected</span>
            </div>
            <p className="text-sm text-gray-500">
              Connect a Gmail account to start ingesting competitor emails.
            </p>
            <button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Plug className="h-4 w-4" />
              Connect Gmail
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
