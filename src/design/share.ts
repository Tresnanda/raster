import LZString from 'lz-string'
import type { Design } from '../types'
import { DEFAULT_TYPOGRAPHY, DEFAULT_STYLE } from './typeclass'

/**
 * DB-free sharing: the entire Design is serialized, compressed, and carried in the
 * URL hash (`#d=...`). No backend, no storage.
 *
 * The one hard problem: uploaded images are base64 dataURLs (often megabytes), which
 * cannot fit in a shareable URL. Since there's no server to host them, we STRIP
 * dataURL image bytes from the shared payload — http(s) image URLs are kept (they
 * travel fine), dataURL images become empty so the recipient sees the [Image Here]
 * placeholder. Everything else (layout, text, type, palette, effects, transforms)
 * round-trips exactly.
 */

const isDataUrl = (v?: string): boolean => !!v && v.startsWith('data:')

/** Replace heavy dataURL image bytes with empty; keep http(s) image URLs. */
function stripImageBytes(design: Design): Design {
  return {
    ...design,
    slots: design.slots.map(s => {
      if (s.role !== 'image') return s
      return {
        ...s,
        content: isDataUrl(s.content) ? '' : s.content,
        imageSrcOriginal: isDataUrl(s.imageSrcOriginal) ? undefined : s.imageSrcOriginal,
      }
    }),
  }
}

/** Serialize + compress a Design into a URL-safe token. */
export function encodeDesign(design: Design): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(stripImageBytes(design)))
}

/** Decode a token back into a Design, merging defaults (mirrors the store's load
 *  migration) so older/partial payloads don't crash. Returns null on bad input. */
export function decodeDesign(token: string): Design | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(token)
    if (!json) return null
    const d = JSON.parse(json) as Design
    if (!d || typeof d !== 'object' || !Array.isArray(d.slots) || !d.format) return null
    return {
      ...d,
      typography: { ...DEFAULT_TYPOGRAPHY, ...d.typography },
      style: { ...DEFAULT_STYLE, ...d.style },
      layout: typeof d.layout === 'number' ? d.layout : 0,
      slots: d.slots.map((s, i) => ({ ...s, z: typeof s.z === 'number' ? s.z : i })),
    }
  } catch {
    return null
  }
}

/** Full shareable URL for the current design (uses the hash so it's client-only). */
export function buildShareUrl(design: Design): string {
  const base = window.location.origin + window.location.pathname
  return `${base}#d=${encodeDesign(design)}`
}

/** If the current URL hash carries a shared design, decode it. */
export function readShareFromHash(): Design | null {
  const m = window.location.hash.match(/[#&]d=([^&]+)/)
  if (!m) return null
  return decodeDesign(m[1])
}
