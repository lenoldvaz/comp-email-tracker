import type {
  DraftBlock,
  BlockType,
  TextBlockProps,
  ImageBlockProps,
  ButtonBlockProps,
  ColumnsBlockProps,
  DividerBlockProps,
  SpacerBlockProps,
  HeaderBlockProps,
  FooterBlockProps,
  GlobalStyles,
} from "@/types/draft"

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

export function createDefaultBlock(type: BlockType): DraftBlock {
  const defaults: Record<BlockType, DraftBlock["properties"]> = {
    text: { content: "<p>Enter your text here</p>", fontSize: 16, color: "#333333", alignment: "left", padding: "10px 20px" } as TextBlockProps,
    image: { src: "", alt: "", width: "100%", alignment: "center", link: "" } as ImageBlockProps,
    button: { text: "Click Me", url: "#", backgroundColor: "#3b82f6", textColor: "#ffffff", borderRadius: "4px", padding: "12px 24px", alignment: "center" } as ButtonBlockProps,
    columns: { columns: 2, gap: "20px", contents: ["", ""] } as ColumnsBlockProps,
    divider: { color: "#e5e7eb", thickness: 1, widthPercent: 100, margin: "20px 0" } as DividerBlockProps,
    spacer: { height: 20 } as SpacerBlockProps,
    header: { content: "<h1>Header</h1>", backgroundColor: "#f8fafc", padding: "20px", logoSrc: "", logoAlt: "" } as HeaderBlockProps,
    footer: { content: "<p>Footer text</p>", backgroundColor: "#f8fafc", padding: "20px", fontSize: 12, color: "#6b7280" } as FooterBlockProps,
  }
  return { id: generateId(), type, properties: defaults[type] }
}

function renderTextBlock(props: TextBlockProps): string {
  return `<tr><td style="font-size:${props.fontSize}px;color:${props.color};text-align:${props.alignment};padding:${props.padding};font-family:inherit;">${props.content}</td></tr>`
}

function renderImageBlock(props: ImageBlockProps): string {
  const imgTag = `<img src="${props.src}" alt="${props.alt}" width="${props.width}" style="max-width:100%;height:auto;display:block;${props.alignment === "center" ? "margin:0 auto;" : ""}" />`
  const wrapped = props.link ? `<a href="${props.link}">${imgTag}</a>` : imgTag
  return `<tr><td style="text-align:${props.alignment};padding:10px 20px;">${wrapped}</td></tr>`
}

function renderButtonBlock(props: ButtonBlockProps): string {
  return `<tr><td style="text-align:${props.alignment};padding:10px 20px;">
  <a href="${props.url}" style="display:inline-block;background-color:${props.backgroundColor};color:${props.textColor};text-decoration:none;padding:${props.padding};border-radius:${props.borderRadius};font-family:inherit;font-size:16px;font-weight:600;">${props.text}</a>
</td></tr>`
}

function renderColumnsBlock(props: ColumnsBlockProps): string {
  const width = Math.floor(100 / props.columns)
  const cols = props.contents
    .slice(0, props.columns)
    .map((content) => `<td style="width:${width}%;vertical-align:top;padding:0 ${parseInt(props.gap) / 2}px;">${content || "&nbsp;"}</td>`)
    .join("\n")
  return `<tr><td style="padding:10px 20px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cols}</tr></table></td></tr>`
}

function renderDividerBlock(props: DividerBlockProps): string {
  return `<tr><td style="padding:${props.margin};"><table width="${props.widthPercent}%" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="border-top:${props.thickness}px solid ${props.color};font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>`
}

function renderSpacerBlock(props: SpacerBlockProps): string {
  return `<tr><td style="height:${props.height}px;font-size:0;line-height:0;">&nbsp;</td></tr>`
}

function renderHeaderBlock(props: HeaderBlockProps): string {
  const logo = props.logoSrc ? `<img src="${props.logoSrc}" alt="${props.logoAlt}" style="max-width:200px;height:auto;" /><br/>` : ""
  return `<tr><td style="background-color:${props.backgroundColor};padding:${props.padding};text-align:center;">${logo}${props.content}</td></tr>`
}

function renderFooterBlock(props: FooterBlockProps): string {
  return `<tr><td style="background-color:${props.backgroundColor};padding:${props.padding};font-size:${props.fontSize}px;color:${props.color};text-align:center;">${props.content}</td></tr>`
}

export function blocksToHtml(blocks: DraftBlock[], styles?: GlobalStyles | null): string {
  const fontFamily = styles?.fontFamily || "Arial, Helvetica, sans-serif"
  const rows = blocks.map((block) => {
    switch (block.type) {
      case "text": return renderTextBlock(block.properties as TextBlockProps)
      case "image": return renderImageBlock(block.properties as ImageBlockProps)
      case "button": return renderButtonBlock(block.properties as ButtonBlockProps)
      case "columns": return renderColumnsBlock(block.properties as ColumnsBlockProps)
      case "divider": return renderDividerBlock(block.properties as DividerBlockProps)
      case "spacer": return renderSpacerBlock(block.properties as SpacerBlockProps)
      case "header": return renderHeaderBlock(block.properties as HeaderBlockProps)
      case "footer": return renderFooterBlock(block.properties as FooterBlockProps)
      default: return ""
    }
  }).join("\n")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Email</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:${fontFamily};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;max-width:600px;width:100%;">
${rows}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function htmlToBlocks(html: string): DraftBlock[] {
  const blocks: DraftBlock[] = []

  // Best-effort parser: extract content from table rows
  const rowRegex = /<tr>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi
  let match
  while ((match = rowRegex.exec(html)) !== null) {
    const content = match[1].trim()
    if (!content || content === "&nbsp;") continue

    // Skip wrapper table rows
    if (content.includes('<table width="100%"') && content.includes('<table width="600"')) continue

    if (content.includes("<img")) {
      const srcMatch = content.match(/src="([^"]*)"/)
      const altMatch = content.match(/alt="([^"]*)"/)
      blocks.push({
        id: generateId(),
        type: "image",
        properties: {
          src: srcMatch?.[1] || "",
          alt: altMatch?.[1] || "",
          width: "100%",
          alignment: "center",
          link: "",
        } as ImageBlockProps,
      })
    } else if (content.includes("border-top:") && content.includes("line-height:0")) {
      blocks.push({
        id: generateId(),
        type: "divider",
        properties: { color: "#e5e7eb", thickness: 1, widthPercent: 100, margin: "20px 0" } as DividerBlockProps,
      })
    } else if (content.match(/^&nbsp;$/) || (content === "&nbsp;" && match[0].includes("height:"))) {
      const heightMatch = match[0].match(/height:(\d+)px/)
      blocks.push({
        id: generateId(),
        type: "spacer",
        properties: { height: heightMatch ? parseInt(heightMatch[1]) : 20 } as SpacerBlockProps,
      })
    } else if (content.includes("display:inline-block") && content.includes("<a ")) {
      const textMatch = content.match(/>([^<]+)<\/a>/)
      const hrefMatch = content.match(/href="([^"]*)"/)
      const bgMatch = content.match(/background-color:(#[0-9a-fA-F]{6})/)
      blocks.push({
        id: generateId(),
        type: "button",
        properties: {
          text: textMatch?.[1] || "Button",
          url: hrefMatch?.[1] || "#",
          backgroundColor: bgMatch?.[1] || "#3b82f6",
          textColor: "#ffffff",
          borderRadius: "4px",
          padding: "12px 24px",
          alignment: "center",
        } as ButtonBlockProps,
      })
    } else {
      blocks.push({
        id: generateId(),
        type: "text",
        properties: {
          content,
          fontSize: 16,
          color: "#333333",
          alignment: "left",
          padding: "10px 20px",
        } as TextBlockProps,
      })
    }
  }

  return blocks
}
