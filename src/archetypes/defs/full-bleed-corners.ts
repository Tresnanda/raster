import type { ArchetypeDef } from '../schema'

// Archetype D — full-bleed image with corner text overlays.
const fullBleedCorners: ArchetypeDef = {
  id: 'full-bleed-corners',
  name: 'Full-Bleed Corners',
  ground: 'dark',
  slots: [
    { id: 'image', role: 'image', placeholder: '' },
    { id: 'tlCap', role: 'caption', placeholder: 'SERIES 04',
      text: { family: 'sans', weight: 600, size: 20, tracking: 0.04, leading: 1.2, align: 'left', fit: 'fixed' } },
    { id: 'trCap', role: 'caption', placeholder: '2026 / SYD',
      text: { family: 'sans', weight: 600, size: 20, tracking: 0.04, leading: 1.2, align: 'right', fit: 'fixed' } },
    { id: 'headline', role: 'headline', placeholder: 'EDGE WORK',
      text: { family: 'display', weight: 800, size: 160, tracking: -0.02, leading: 0.9, align: 'right', fit: 'auto' } },
    { id: 'mark', role: 'mark', placeholder: 'Raster',
      text: { family: 'sans', weight: 600, size: 20, tracking: 0.04, leading: 1.2, align: 'left', fit: 'fixed' } },
  ],
  variants: [
    // Variant 0: headline bottom-right, caps top corners
    {
      image:    { c: 0, cs: 12, r: 0,  rs: 16 },
      tlCap:    { c: 0, cs: 3,  r: 0,  rs: 2  },
      trCap:    { c: 9, cs: 3,  r: 0,  rs: 2  },
      headline: { c: 5, cs: 7,  r: 10, rs: 4  },
      mark:     { c: 0, cs: 2,  r: 14, rs: 1  },
    },
    // Variant 1: headline bottom-left (align left), mark bottom-right
    {
      image:    { c: 0,  cs: 12, r: 0,  rs: 16 },
      tlCap:    { c: 0,  cs: 3,  r: 0,  rs: 2  },
      trCap:    { c: 9,  cs: 3,  r: 0,  rs: 2  },
      headline: { c: 0,  cs: 7,  r: 10, rs: 4  },
      mark:     { c: 10, cs: 2,  r: 14, rs: 1  },
    },
  ],
}

export default fullBleedCorners
