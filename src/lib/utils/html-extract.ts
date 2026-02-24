import type { ExtractedLink, ExtractedImage } from "@/types/email"

export function extractLinks(html: string): ExtractedLink[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  const anchors = doc.querySelectorAll("a[href]")
  const seen = new Set<string>()
  const links: ExtractedLink[] = []

  for (const a of anchors) {
    const href = a.getAttribute("href") || ""
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) continue
    if (seen.has(href)) continue
    seen.add(href)
    links.push({
      href,
      text: a.textContent?.trim() || "",
      status: null,
      error: null,
    })
  }
  return links
}

export function extractImages(html: string): ExtractedImage[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  const imgs = doc.querySelectorAll("img")
  const seen = new Set<string>()
  const images: ExtractedImage[] = []

  for (const img of imgs) {
    const src = img.getAttribute("src") || ""
    if (!src) continue
    if (seen.has(src)) continue
    seen.add(src)
    images.push({
      src,
      alt: img.getAttribute("alt") || "",
      width: img.getAttribute("width"),
      height: img.getAttribute("height"),
      loaded: null,
    })
  }
  return images
}

/**
 * Annotates HTML by adding data-ce-idx attributes to every element.
 * Returns annotated HTML and a lineMap that maps formatted code line numbers
 * to element indices (for highlight sync in code view).
 */
export function annotateHtml(html: string): { annotated: string; lineMap: Map<number, number> } {
  let idx = 0
  const annotated = html.replace(/<(\w[\w-]*)([\s>])/g, (_match, tag: string, after: string) => {
    const currentIdx = idx++
    return `<${tag} data-ce-idx="${currentIdx}"${after}`
  })
  return { annotated, lineMap: buildLineMap(annotated) }
}

/** Build a map from line number (1-based) to the data-ce-idx on that line */
function buildLineMap(annotated: string): Map<number, number> {
  const map = new Map<number, number>()
  const lines = annotated.split("\n")
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/data-ce-idx="(\d+)"/)
    if (match) {
      map.set(i + 1, parseInt(match[1], 10))
    }
  }
  return map
}

export function highlightHtml(raw: string): string {
  let escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

  // Highlight comments
  escaped = escaped.replace(
    /(&lt;!--[\s\S]*?--&gt;)/g,
    '<span class="text-gray-400 italic">$1</span>'
  )

  // Highlight closing/self-closing markers
  escaped = escaped.replace(
    /(&lt;\/?)([\w-]+)/g,
    '<span class="text-gray-500">$1</span><span class="text-blue-600">$2</span>'
  )

  // Highlight attributes (word=)
  escaped = escaped.replace(
    /\s([\w-]+)(=)/g,
    ' <span class="text-orange-500">$1</span>$2'
  )

  // Highlight quoted attribute values
  escaped = escaped.replace(
    /(&quot;)(.*?)(&quot;)/g,
    '<span class="text-green-600">&quot;$2&quot;</span>'
  )

  return escaped
}
