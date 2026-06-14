import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import JSZip from 'jszip'
import { Renderer } from '../render/Renderer'
import { defaultMeasurer } from '../lib/measure'
import { canvasFor } from '../design/formats'
import { rasterizeSvg, rasterSize } from './to-raster'
import { buildEmbeddedFontCss, downloadBlob } from './to-svg'
import { EXPORT_FACES } from './useExport'
import type { Design, Format } from '../types'

/** The "social kit" — the formats people actually post. */
export const KIT_FORMATS: Format[] = ['4:5', '1:1', '9:16', '2:3']

const KIT_LABELS: Record<string, string> = {
  '4:5': 'feed', '1:1': 'square', '9:16': 'story', '2:3': 'poster',
}

/** Inject embedded @font-face CSS into a serialized SVG string so the rasterized
 *  output uses the real fonts (mirrors serializeSvg, but for a string). */
function injectFontCss(svgString: string, fontCss: string): string {
  return svgString.replace(/(<svg[^>]*>)/, `$1<defs><style>${fontCss}</style></defs>`)
}

/**
 * Export the current design across all KIT_FORMATS at once as a single .zip of
 * high-res PNGs. Each format is rendered headlessly via renderToStaticMarkup (the
 * Renderer is pure) so we don't disturb the on-screen poster.
 */
export async function exportKit(design: Design, opts: { scale?: number } = {}): Promise<void> {
  const scale = opts.scale ?? 2
  const fontCss = await buildEmbeddedFontCss(EXPORT_FACES)
  const measure = defaultMeasurer()
  const zip = new JSZip()

  for (const format of KIT_FORMATS) {
    const d: Design = { ...design, format }
    const svgString = renderToStaticMarkup(createElement(Renderer, { design: d, measure }))
    const withFonts = injectFontCss(svgString, fontCss)
    const blob = await rasterizeSvg(withFonts, rasterSize(canvasFor(format), scale), 'image/png')
    zip.file(`raster-${KIT_LABELS[format] ?? format.replace(':', 'x')}-${format.replace(':', 'x')}.png`, blob)
  }

  const out = await zip.generateAsync({ type: 'blob' })
  downloadBlob(out, `raster-kit-${design.layout}.zip`)
}
