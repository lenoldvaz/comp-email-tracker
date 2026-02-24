"use client"

import { createContext, useContext } from "react"

interface UserContextValue {
  userId: string
  userName: string | null
  userRole: string
}

const UserContext = createContext<UserContextValue>({
  userId: "",
  userName: null,
  userRole: "MEMBER",
})

export function UserProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: UserContextValue
}) {
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  return useContext(UserContext)
}
