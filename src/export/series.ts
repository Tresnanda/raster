import JSZip from 'jszip'
import type { Design } from '../types'
import { buildSeries } from '../design/series'
import { defaultMeasurer } from '../lib/measure'
import { renderDesignToPng, buildEmbeddedFontCss } from './kit'
import { downloadBlob } from './to-svg'
import { EXPORT_FACES } from './useExport'

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'item'

/**
 * Render a matched series (one poster per item, same system) and download them as
 * a single .zip of high-res PNGs. Headless — doesn't disturb the on-screen poster.
 */
export async function exportSeries(
  template: Design,
  items: string[],
  opts: { scale?: number } = {},
): Promise<void> {
  if (!items.length) return
  const scale = opts.scale ?? 2
  const fontCss = await buildEmbeddedFontCss(EXPORT_FACES)
  const measure = defaultMeasurer()
  const designs = buildSeries(template, items)
  const zip = new JSZip()

  for (let i = 0; i < designs.length; i++) {
    const blob = await renderDesignToPng(designs[i], fontCss, measure, scale)
    const n = String(i + 1).padStart(2, '0')
    zip.file(`${n}-${slug(items[i])}.png`, blob)
  }

  const out = await zip.generateAsync({ type: 'blob' })
  downloadBlob(out, `raster-series-${template.layout}.zip`)
}
