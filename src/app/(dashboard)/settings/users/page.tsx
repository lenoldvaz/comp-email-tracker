"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function UsersPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/settings/team")
  }, [router])

  return (
    <div className="flex items-center justify-center p-12">
      <p className="text-sm text-gray-500">Redirecting to Team Management...</p>
    </div>
  )
}
