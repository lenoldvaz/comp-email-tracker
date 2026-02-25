"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useOrg } from "../../org-context"
import { useUser } from "../../user-context"
import { format } from "date-fns"
import { toast } from "sonner"
import { useState } from "react"
import { Copy, Trash2, UserPlus, Plus } from "lucide-react"

interface Member {
  id: string
  name: string | null
  email: string
  role: string
  joinedAt: string
}

interface Invitation {
  id: string
  email: string
  role: string
  token: string
  expires_at: string
  created_at: string
}

export default function TeamPage() {
  const { orgId, orgRole } = useOrg()
  const { userId } = useUser()
  const queryClient = useQueryClient()
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("MEMBER")
  const [showInviteForm, setShowInviteForm] = useState(false)
  const isAdmin = orgRole === "ADMIN"

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ["org-members", orgId],
    queryFn: () => fetch(`/api/orgs/${orgId}/members`).then((r) => r.json()),
    enabled: !!orgId,
  })

  const { data: invitations } = useQuery<Invitation[]>({
    queryKey: ["org-invitations", orgId],
    queryFn: () => fetch(`/api/orgs/${orgId}/invitations`).then((r) => r.json()),
    enabled: !!orgId && isAdmin,
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      fetch(`/api/orgs/${orgId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error) })
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members", orgId] })
      toast.success("Role updated")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update role"),
  })

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      fetch(`/api/orgs/${orgId}/members/${memberId}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error) })
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members", orgId] })
      toast.success("Member removed")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to remove member"),
  })

  const inviteMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/orgs/${orgId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      }).then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error)
        return data
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["org-invitations", orgId] })
      setInviteEmail("")
      setShowInviteForm(false)
      // Copy invite link to clipboard
      if (data.inviteUrl) {
        navigator.clipboard.writeText(data.inviteUrl)
        toast.success("Invitation created! Link copied to clipboard.")
      } else {
        toast.success("Invitation created")
      }
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create invitation"),
  })

  const revokeInviteMutation = useMutation({
    mutationFn: (inviteId: string) =>
      fetch(`/api/orgs/${orgId}/invitations/${inviteId}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Failed")
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-invitations", orgId] })
      toast.success("Invitation revoked")
    },
    onError: () => toast.error("Failed to revoke invitation"),
  })

  const [newOrgName, setNewOrgName] = useState("")
  const [creatingOrg, setCreatingOrg] = useState(false)

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault()
    if (!newOrgName.trim()) return
    setCreatingOrg(true)
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create organization")
      }
      const org = await res.json()
      toast.success("Organization created!")
      // Set as active org and reload
      document.cookie = `activeOrgId=${org.id};path=/;max-age=${60 * 60 * 24 * 365}`
      window.location.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create organization")
    } finally {
      setCreatingOrg(false)
    }
  }

  if (!orgId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg border bg-white p-8 text-center">
          <Plus className="mx-auto mb-4 h-10 w-10 text-gray-300" />
          <h2 className="mb-2 text-lg font-semibold">Create an Organization</h2>
          <p className="mb-6 text-sm text-gray-500">
            Organizations let you collaborate with your team. Create one to get started.
          </p>
          <form onSubmit={handleCreateOrg} className="flex gap-2">
            <input
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Organization name"
              required
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={creatingOrg}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creatingOrg ? "Creating..." : "Create"}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team Management</h1>
        {isAdmin && (
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4" />
            Invite Member
          </button>
        )}
      </div>

      {/* Invite form */}
      {showInviteForm && (
        <div className="rounded-lg border bg-white p-4">
          <h3 className="mb-3 font-medium">Send Invitation</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-500 mb-1">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
            <button
              onClick={() => inviteMutation.mutate()}
              disabled={!inviteEmail || inviteMutation.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {inviteMutation.isPending ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </div>
      )}

      {/* Members table */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Members ({members?.length || 0})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Joined</th>
              {isAdmin && (
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="h-5 animate-pulse rounded bg-gray-100" />
                    </td>
                  </tr>
                ))
              : members?.map((member) => (
                  <tr key={member.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{member.name || "---"}</td>
                    <td className="px-4 py-3 text-gray-600">{member.email}</td>
                    <td className="px-4 py-3">
                      {isAdmin && member.id !== userId ? (
                        <select
                          value={member.role}
                          onChange={(e) =>
                            updateRoleMutation.mutate({
                              memberId: member.id,
                              role: e.target.value,
                            })
                          }
                          className="rounded border border-gray-300 px-2 py-1 text-xs"
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="MEMBER">Member</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      ) : (
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            member.role === "ADMIN"
                              ? "bg-blue-100 text-blue-700"
                              : member.role === "VIEWER"
                                ? "bg-gray-100 text-gray-500"
                                : "bg-green-100 text-green-700"
                          }`}
                        >
                          {member.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {format(new Date(member.joinedAt), "MMM d, yyyy")}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        {member.id !== userId && (
                          <button
                            onClick={() => {
                              if (confirm("Remove this member?")) {
                                removeMemberMutation.mutate(member.id)
                              }
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pending invitations */}
      {isAdmin && invitations && invitations.length > 0 && (
        <div className="rounded-lg border bg-white">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold">Pending Invitations ({invitations.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Expires</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{inv.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {inv.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {format(new Date(inv.expires_at), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/invite?token=${inv.token}`
                          navigator.clipboard.writeText(url)
                          toast.success("Link copied!")
                        }}
                        className="text-gray-500 hover:text-gray-700"
                        title="Copy invite link"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => revokeInviteMutation.mutate(inv.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Revoke invitation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
