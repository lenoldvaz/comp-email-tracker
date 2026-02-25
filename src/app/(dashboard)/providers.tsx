"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { useState } from "react"
import { UserProvider } from "./user-context"
import { OrgProvider, type OrgMembership } from "./org-context"

export function Providers({
  children,
  userId,
  userName,
  userRole,
  orgId,
  orgName,
  orgRole,
  orgs,
}: {
  children: React.ReactNode
  userId: string
  userName: string
  userRole: string
  orgId: string
  orgName: string
  orgRole: string
  orgs: OrgMembership[]
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30 * 1000, refetchOnWindowFocus: false },
        },
      })
  )

  return (
    <UserProvider value={{ userId, userName, userRole }}>
      <OrgProvider value={{ orgId, orgName, orgRole, orgs }}>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster position="bottom-right" />
        </QueryClientProvider>
      </OrgProvider>
    </UserProvider>
  )
}
