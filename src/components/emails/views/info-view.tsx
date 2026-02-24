"use client"

import { format } from "date-fns"
import { ExternalLink, CheckCircle, XCircle, Loader2, ImageIcon } from "lucide-react"
import Link from "next/link"
import { Collapsible } from "@/components/ui/collapsible"
import type { EmailDetail, ExtractedLink, ExtractedImage } from "@/types/email"

interface InfoViewProps {
  email: EmailDetail
  links: ExtractedLink[]
  images: ExtractedImage[]
  onValidateLinks: () => void
  linksLoading: boolean
}

export function InfoView({
  email,
  links,
  images,
  onValidateLinks,
  linksLoading,
}: InfoViewProps) {
  return (
    <div className="divide-y">
      {/* Metadata */}
      <div className="space-y-3 p-4">
        <h3 className="text-sm font-semibold text-gray-900">Email Details</h3>
        <dl className="space-y-2 text-sm">
          <Row label="From" value={email.senderName || email.senderAddress} />
          <Row label="Email" value={email.senderAddress} />
          <Row
            label="Date"
            value={format(new Date(email.receivedAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
          />
          <Row label="Message-ID" value={email.messageId} mono />
          {email.competitor && (
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 text-gray-500">Competitor</dt>
              <dd className="flex items-center gap-2">
                {email.competitor.colourHex && (
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: email.competitor.colourHex }}
                  />
                )}
                <Link
                  href={`/competitors/${email.competitor.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {email.competitor.name}
                </Link>
              </dd>
            </div>
          )}
          <Row label="Category" value={email.category?.name || "Uncategorized"} />
          {email.tags.length > 0 && (
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 text-gray-500">Tags</dt>
              <dd className="flex flex-wrap gap-1">
                {email.tags.map((t) => (
                  <span
                    key={t.id}
                    className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600"
                  >
                    {t.name}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Links */}
      <Collapsible
        title="Links"
        count={links.length}
        defaultOpen={links.length > 0}
        action={
          links.length > 0 ? (
            <button
              onClick={onValidateLinks}
              disabled={linksLoading}
              className="flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 disabled:opacity-50"
            >
              {linksLoading && <Loader2 className="h-3 w-3 animate-spin" />}
              {linksLoading ? "Validating..." : "Validate All"}
            </button>
          ) : undefined
        }
      >
        {links.length === 0 ? (
          <p className="text-sm text-gray-400">No links found</p>
        ) : (
          <div className="space-y-1.5">
            {links.map((link, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm"
              >
                <LinkStatus status={link.status} error={link.error} />
                <div className="min-w-0 flex-1">
                  {link.text && (
                    <div className="truncate font-medium text-gray-700">
                      {link.text}
                    </div>
                  )}
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 truncate text-xs text-blue-500 hover:underline"
                  >
                    {link.href}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Collapsible>

      {/* Images */}
      <Collapsible
        title="Images"
        count={images.length}
        defaultOpen={images.length > 0 && images.length <= 20}
      >
        {images.length === 0 ? (
          <p className="text-sm text-gray-400">No images found</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {images.map((img, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-md border bg-white"
              >
                <div className="flex h-24 items-center justify-center bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.src}
                    alt={img.alt || ""}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                      e.currentTarget.nextElementSibling?.classList.remove("hidden")
                    }}
                  />
                  <div className="hidden flex-col items-center text-gray-300">
                    <ImageIcon className="h-6 w-6" />
                    <span className="text-xs">Broken</span>
                  </div>
                </div>
                <div className="space-y-0.5 p-2">
                  {img.alt && (
                    <div className="truncate text-xs text-gray-700">
                      {img.alt}
                    </div>
                  )}
                  <div className="truncate text-xs text-gray-400">{img.src}</div>
                  {(img.width || img.height) && (
                    <div className="text-xs text-gray-400">
                      {img.width}x{img.height}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Collapsible>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-gray-500">{label}</dt>
      <dd className={`min-w-0 break-all text-gray-900 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  )
}

function LinkStatus({
  status,
  error,
}: {
  status?: number | null
  error?: string | null
}) {
  if (status == null && !error) {
    return <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-gray-200" />
  }
  if (error || (status && status >= 400)) {
    return (
      <span title={error || `Status ${status}`}>
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
      </span>
    )
  }
  return (
    <span title={`Status ${status}`}>
      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
    </span>
  )
}
