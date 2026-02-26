export interface EmailDraft {
  id: string
  orgId: string
  title: string
  subject: string
  htmlContent: string
  textContent: string
  isTemplate: boolean
  templateName: string | null
  createdBy: string
  updatedAt: string
  createdAt: string
}

export interface EmailSnippet {
  id: string
  orgId: string
  name: string
  description: string
  htmlContent: string
  createdBy: string
  updatedAt: string
  createdAt: string
}

export interface GlobalStyles {
  id: string
  orgId: string
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  headingFont: string
  buttonStyle: { borderRadius: string; padding: string }
  linkColor: string
  updatedAt: string
}

export type BlockType =
  | "text"
  | "image"
  | "button"
  | "columns"
  | "divider"
  | "spacer"
  | "header"
  | "footer"

export interface TextBlockProps {
  content: string
  fontSize: number
  color: string
  alignment: "left" | "center" | "right"
  padding: string
  fontFamily?: string
}

export interface ImageBlockProps {
  src: string
  alt: string
  width: string
  alignment: "left" | "center" | "right"
  link: string
}

export interface ButtonBlockProps {
  text: string
  url: string
  backgroundColor: string
  textColor: string
  borderRadius: string
  padding: string
  alignment: "left" | "center" | "right"
}

export interface ColumnsBlockProps {
  columns: number
  gap: string
  contents: string[]
}

export interface DividerBlockProps {
  color: string
  thickness: number
  widthPercent: number
  margin: string
}

export interface SpacerBlockProps {
  height: number
}

export interface HeaderBlockProps {
  content: string
  backgroundColor: string
  padding: string
  logoSrc: string
  logoAlt: string
}

export interface FooterBlockProps {
  content: string
  backgroundColor: string
  padding: string
  fontSize: number
  color: string
}

export type BlockProperties =
  | TextBlockProps
  | ImageBlockProps
  | ButtonBlockProps
  | ColumnsBlockProps
  | DividerBlockProps
  | SpacerBlockProps
  | HeaderBlockProps
  | FooterBlockProps

export interface DraftBlock {
  id: string
  type: BlockType
  properties: BlockProperties
}

export interface ValidationResult {
  category: "links" | "images" | "accessibility" | "spam" | "clipping"
  items: ValidationItem[]
}

export interface ValidationItem {
  severity: "pass" | "warn" | "fail"
  message: string
  details?: string
}

export interface TransformOptions {
  inlineCss: boolean
  minify: boolean
  cleanCss: boolean
  utmParams?: {
    source: string
    medium: string
    campaign: string
  }
}
