import type { ArchetypeDef } from '../schema'

// Archetype H — image left half, text right half.
const splitDiptych: ArchetypeDef = {
  id: 'split-diptych',
  name: 'Split Diptych',
  ground: 'dark',
  slots: [
    { id: 'image', role: 'image', placeholder: '' },
    { id: 'headline', role: 'headline', placeholder: 'HALF AND HALF',
      text: { family: 'display', weight: 800, size: 120, tracking: -0.02, leading: 0.9, align: 'left', fit: 'auto' } },
    { id: 'kicker', role: 'caption', placeholder: 'Issue 12',
      text: { family: 'sans', weight: 600, size: 20, tracking: 0.04, leading: 1.2, align: 'left', fit: 'fixed' } },
    { id: 'footer', role: 'caption', placeholder: 'raster.studio',
      text: { family: 'sans', weight: 500, size: 18, tracking: 0.01, leading: 1.2, align: 'left', fit: 'fixed' } },
  ],
  variants: [
    // Variant 0: image left 6 cols, text right 6 cols
    {
      image:    { c: 0, cs: 6, r: 0,  rs: 16 },
      headline: { c: 6, cs: 6, r: 9,  rs: 4  },
      kicker:   { c: 6, cs: 6, r: 1,  rs: 1  },
      footer:   { c: 6, cs: 6, r: 14, rs: 1  },
    },
    // Variant 1: image right 6 cols, text left 6 cols
    {
      image:    { c: 6, cs: 6, r: 0,  rs: 16 },
      headline: { c: 0, cs: 6, r: 9,  rs: 4  },
      kicker:   { c: 0, cs: 6, r: 1,  rs: 1  },
      footer:   { c: 0, cs: 6, r: 14, rs: 1  },
    },
  ],
}

export default splitDiptych
