"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useOrg } from "@/app/(dashboard)/org-context"
import { toast } from "sonner"
import type { EmailDetail, Category } from "@/types/email"
import { useEmailView } from "@/hooks/use-email-view"
import { EmailHeader } from "./email-header"
import { EmailViewTabs } from "./email-view-tabs"
import { EmailViewToolbar } from "./email-view-toolbar"
import { DesktopView } from "./views/desktop-view"
import { MobileView } from "./views/mobile-view"
import { CodeView } from "./views/code-view"
import { TextView } from "./views/text-view"
import { InfoView } from "./views/info-view"

interface EmailPreviewProps {
  emailId: string
  focusMode?: boolean
  onFocusToggle?: () => void
}

export function EmailPreview({ emailId, focusMode, onFocusToggle }: EmailPreviewProps) {
  const queryClient = useQueryClient()
  const { orgId } = useOrg()

  const { data: email, isLoading } = useQuery<EmailDetail>({
    queryKey: ["email", emailId],
    queryFn: () => fetch(`/api/emails/${emailId}`).then((r) => r.json()),
    enabled: !!emailId,
  })

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories", orgId],
    queryFn: () => fetch(`/api/categories?orgId=${orgId}`).then((r) => r.json()),
    enabled: !!orgId,
  })

  const updateCategory = useMutation({
    mutationFn: (categoryId: string | null) =>
      fetch(`/api/emails/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email", emailId] })
      queryClient.invalidateQueries({ queryKey: ["emails"] })
      toast.success("Category updated")
    },
  })

  const view = useEmailView(emailId, email?.bodyHtml ?? null)

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (!email) return null

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <EmailHeader
        email={email}
        categories={categories || []}
        onCategoryChange={(id) => updateCategory.mutate(id)}
        compact
        showFullLink
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
          focusMode={focusMode}
          onFocusToggle={onFocusToggle}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
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
  )
}
