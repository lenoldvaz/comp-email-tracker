import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="rounded-lg border bg-white p-8 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm text-gray-500">
          Competitor Email Intelligence
        </p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}
