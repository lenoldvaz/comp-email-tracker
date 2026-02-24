"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import type { EmailDetail, Category } from "@/types/email"
import { useEmailView } from "@/hooks/use-email-view"
import { EmailHeader } from "@/components/emails/email-header"
import { EmailViewTabs } from "@/components/emails/email-view-tabs"
import { EmailViewToolbar } from "@/components/emails/email-view-toolbar"
import { DesktopView } from "@/components/emails/views/desktop-view"
import { MobileView } from "@/components/emails/views/mobile-view"
import { CodeView } from "@/components/emails/views/code-view"
import { TextView } from "@/components/emails/views/text-view"
import { InfoView } from "@/components/emails/views/info-view"

export default function EmailDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: email, isLoading } = useQuery<EmailDetail>({
    queryKey: ["email", id],
    queryFn: () => fetch(`/api/emails/${id}`).then((r) => r.json()),
  })

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  })

  const updateCategory = useMutation({
    mutationFn: (categoryId: string | null) =>
      fetch(`/api/emails/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email", id] })
      toast.success("Category updated")
    },
  })

  const view = useEmailView(id, email?.bodyHtml ?? null)

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (!email) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        Email not found
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to list
      </button>

      <div className="overflow-hidden rounded-lg border bg-white">
        <EmailHeader
          email={email}
          categories={categories || []}
          onCategoryChange={(id) => updateCategory.mutate(id)}
        />

        {/* Merged tabs + toolbar row */}
        <div className="flex items-center border-b bg-white px-3 py-1.5">
          <EmailViewTabs
            activeView={view.activeView}
            onViewChange={view.setActiveView}
            hasHtml={!!email.bodyHtml}
            hasText={!!email.bodyText}
          />
          <div className="flex-1" />
          <EmailViewToolbar
            activeView={view.activeView}
            darkMode={view.darkMode}
            onDarkModeToggle={view.toggleDarkMode}
            previewWidth={view.previewWidth}
            onWidthChange={view.setPreviewWidth}
          />
        </div>

        <div className="min-h-[500px]">
          {view.activeView === "desktop" && (
            <DesktopView
              bodyHtml={email.bodyHtml}
              bodyText={email.bodyText}
              darkMode={view.darkMode}
              previewWidth={view.previewWidth}
            />
          )}
          {view.activeView === "mobile" && (
            <MobileView
              bodyHtml={email.bodyHtml}
              bodyText={email.bodyText}
              darkMode={view.darkMode}
            />
          )}
          {view.activeView === "code" && (
            <CodeView bodyHtml={email.bodyHtml} />
          )}
          {view.activeView === "text" && (
            <TextView bodyText={email.bodyText} />
          )}
          {view.activeView === "info" && (
            <InfoView
              email={email}
              links={view.links}
              images={view.images}
              onValidateLinks={view.validateLinks}
              linksLoading={view.linksLoading}
            />
          )}
        </div>
      </div>
    </div>
  )
}
