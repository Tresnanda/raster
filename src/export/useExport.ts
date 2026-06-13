import { canvasFor } from '../design/formats'
import type { Design } from '../types'
import { buildEmbeddedFontCss, downloadBlob, serializeSvg } from './to-svg'
import { rasterizeSvg, rasterSize } from './to-raster'

// woff2 served from /src/fonts/files via Vite static import URLs.
import inter400 from '../fonts/files/inter-400.woff2?url'
import inter700 from '../fonts/files/inter-700.woff2?url'
import inter800 from '../fonts/files/inter-800.woff2?url'
import archivo800 from '../fonts/files/archivo-800.woff2?url'
import archivo900 from '../fonts/files/archivo-900.woff2?url'
import archivoNarrow700 from '../fonts/files/archivo-narrow-700.woff2?url'
import spaceMono400 from '../fonts/files/space-mono-400.woff2?url'

export const EXPORT_FACES = [
  { family: 'Inter', weight: 400, url: inter400 },
  { family: 'Inter', weight: 700, url: inter700 },
  { family: 'Inter', weight: 800, url: inter800 },
  { family: 'Archivo', weight: 800, url: archivo800 },
  { family: 'Archivo', weight: 900, url: archivo900 },
  { family: 'Archivo Narrow', weight: 700, url: archivoNarrow700 },
  { family: 'Space Mono', weight: 400, url: spaceMono400 },
]

export async function exportSvg(svg: SVGSVGElement, name: string) {
  const css = await buildEmbeddedFontCss(EXPORT_FACES)
  downloadBlob(new Blob([serializeSvg(svg, css)], { type: 'image/svg+xml' }), `${name}.svg`)
}

export async function exportRaster(svg: SVGSVGElement, design: Design, name: string,
  type: 'image/png' | 'image/jpeg', scale = 2) {
  const css = await buildEmbeddedFontCss(EXPORT_FACES)
  const str = serializeSvg(svg, css)
  const blob = await rasterizeSvg(str, rasterSize(canvasFor(design.format), scale), type)
  downloadBlob(blob, `${name}.${type === 'image/png' ? 'png' : 'jpg'}`)
}
