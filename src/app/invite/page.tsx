"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/client"

function InviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"loading" | "accepting" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [orgName, setOrgName] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("No invitation token provided")
      return
    }

    async function handleInvite() {
      // Validate the token first
      const validateRes = await fetch(`/api/invitations/accept?token=${token}`)
      if (!validateRes.ok) {
        const data = await validateRes.json()
        setStatus("error")
        setMessage(data.error || "Invalid invitation")
        return
      }

      const inviteInfo = await validateRes.json()
      setOrgName(inviteInfo.orgName)

      // Check if user is logged in
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Redirect to register with invite token
        router.push(`/register?invite=${token}`)
        return
      }

      // User is logged in, accept the invite
      setStatus("accepting")
      const acceptRes = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })

      if (!acceptRes.ok) {
        const data = await acceptRes.json()
        setStatus("error")
        setMessage(data.error || "Failed to accept invitation")
        return
      }

      setStatus("success")
      setMessage(`You've joined ${inviteInfo.orgName}!`)

      // Redirect to dashboard after a moment
      setTimeout(() => {
        router.push("/emails")
        router.refresh()
      }, 2000)
    }

    handleInvite()
  }, [token, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-sm text-center">
        {status === "loading" && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <p className="text-gray-600">Validating invitation...</p>
          </>
        )}
        {status === "accepting" && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <p className="text-gray-600">Joining {orgName}...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold">{message}</h2>
            <p className="mt-2 text-sm text-gray-500">Redirecting to dashboard...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-red-600">{message}</h2>
            <button
              onClick={() => router.push("/login")}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    }>
      <InviteContent />
    </Suspense>
  )
}
