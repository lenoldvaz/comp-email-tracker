import { Suspense } from "react"
import { RegisterForm } from "@/components/auth/register-form"

export default function RegisterPage() {
  return (
    <div className="rounded-lg border bg-white p-8 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Join your team&apos;s email intelligence workspace
        </p>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded bg-gray-100" />}>
        <RegisterForm />
      </Suspense>
    </div>
  )
}
