"use client"

import { Menu } from "lucide-react"

export function Topbar({
  onMenuToggle,
}: {
  onMenuToggle: () => void
}) {
  return (
    <header className="flex h-14 items-center border-b bg-white px-4 lg:hidden">
      <button onClick={onMenuToggle}>
        <Menu className="h-5 w-5" />
      </button>
    </header>
  )
}
