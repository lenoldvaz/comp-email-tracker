"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useUser } from "../../user-context"
import { format } from "date-fns"
import { toast } from "sonner"

interface User {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
}

export default function UsersPage() {
  const { userId } = useUser()
  const queryClient = useQueryClient()

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => fetch("/api/settings/users").then((r) => r.json()),
  })

  const toggleRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      fetch(`/api/settings/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed")
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("Role updated")
    },
    onError: () => toast.error("Failed to update role"),
  })

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">User Management</h1>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Joined</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
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
              : users?.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {user.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          user.role === "ADMIN"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.id !== userId && (
                        <button
                          onClick={() =>
                            toggleRoleMutation.mutate({
                              userId: user.id,
                              role: user.role === "ADMIN" ? "MEMBER" : "ADMIN",
                            })
                          }
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Make {user.role === "ADMIN" ? "Member" : "Admin"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
