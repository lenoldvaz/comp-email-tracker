export interface EmailDetail {
  id: string
  subject: string
  senderAddress: string
  senderName: string | null
  receivedAt: string
  bodyText: string | null
  bodyHtml: string | null
  messageId: string
  snippet?: string | null
  competitor: { id: string; name: string; colourHex: string | null } | null
  category: { id: string; name: string } | null
  tags: { id: string; name: string }[]
}

export interface Category {
  id: string
  name: string
}

export type EmailViewMode = "desktop" | "mobile" | "code" | "text" | "info"

export interface ExtractedLink {
  href: string
  text: string
  status?: number | null
  error?: string | null
}

export interface ExtractedImage {
  src: string
  alt: string
  width?: string | null
  height?: string | null
  loaded?: boolean | null
}

export interface WidthPreset {
  label: string
  width: number | "full"
}

export const WIDTH_PRESETS: WidthPreset[] = [
  { label: "Phone", width: 320 },
  { label: "Phone L", width: 375 },
  { label: "Tablet", width: 768 },
  { label: "Desktop", width: 1024 },
  { label: "Full", width: "full" },
]
