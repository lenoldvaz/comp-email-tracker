"use client"

import { createContext, useContext } from "react"

export interface OrgMembership {
  orgId: string
  orgName: string
  orgSlug: string
  role: string
}

interface OrgContextValue {
  orgId: string
  orgName: string
  orgRole: string
  orgs: OrgMembership[]
}

const OrgContext = createContext<OrgContextValue>({
  orgId: "",
  orgName: "",
  orgRole: "MEMBER",
  orgs: [],
})

export function OrgProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: OrgContextValue
}) {
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg() {
  return useContext(OrgContext)
}
