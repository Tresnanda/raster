/** Serialize an <svg> node to a standalone string, embedding font CSS in <defs>. */
export function serializeSvg(svg: SVGSVGElement, fontCss: string): string {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  if (fontCss) {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
    style.textContent = fontCss
    defs.appendChild(style)
    clone.insertBefore(defs, clone.firstChild)
  }
  return new XMLSerializer().serializeToString(clone)
}

/** Fetch the used font files and inline them as base64 @font-face rules. */
export async function buildEmbeddedFontCss(
  faces: { family: string; weight: number; url: string }[],
): Promise<string> {
  const rules = await Promise.all(faces.map(async f => {
    const buf = await (await fetch(f.url)).arrayBuffer()
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
    return `@font-face{font-family:'${f.family}';font-weight:${f.weight};src:url(data:font/woff2;base64,${b64}) format('woff2');}`
  }))
  return rules.join('')
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
