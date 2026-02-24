import { RegisterForm } from "@/components/auth/register-form"

export default function RegisterPage() {
  return (
    <div className="rounded-lg border bg-white p-8 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Join your team's email intelligence workspace
        </p>
      </div>
      <RegisterForm />
    </div>
  )
}
