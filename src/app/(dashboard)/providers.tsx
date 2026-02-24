"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { useState } from "react"
import { UserProvider } from "./user-context"

export function Providers({
  children,
  userId,
  userName,
  userRole,
}: {
  children: React.ReactNode
  userId: string
  userName: string
  userRole: string
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
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="bottom-right" />
      </QueryClientProvider>
    </UserProvider>
  )
}
