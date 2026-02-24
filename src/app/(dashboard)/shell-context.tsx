"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface ShellContextValue {
  chromeHidden: boolean
  setChromeHidden: (hidden: boolean) => void
}

const ShellContext = createContext<ShellContextValue>({
  chromeHidden: false,
  setChromeHidden: () => {},
})

export function ShellProvider({ children }: { children: ReactNode }) {
  const [chromeHidden, setChromeHidden] = useState(false)
  return (
    <ShellContext.Provider value={{ chromeHidden, setChromeHidden }}>
      {children}
    </ShellContext.Provider>
  )
}

export function useShell() {
  return useContext(ShellContext)
}
