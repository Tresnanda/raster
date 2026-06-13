import type { ArchetypeDef } from '../schema'

// Archetype G — all typography, no image.
const allType: ArchetypeDef = {
  id: 'all-type',
  name: 'All-Type',
  ground: 'dark',
  slots: [
    { id: 'kicker', role: 'caption', placeholder: 'Vol. 04 — Index',
      text: { family: 'sans', weight: 600, size: 26, tracking: 0.02, leading: 1.2, align: 'left', fit: 'fixed' } },
    { id: 'headline', role: 'headline', placeholder: 'TYPE IS THE IMAGE',
      text: { family: 'display', weight: 900, size: 300, tracking: -0.02, leading: 0.85, align: 'left', fit: 'auto' } },
    { id: 'footL', role: 'caption', placeholder: '2026',
      text: { family: 'sans', weight: 500, size: 22, tracking: 0, leading: 1.2, align: 'left', fit: 'fixed' } },
    { id: 'footR', role: 'caption', placeholder: 'Lab Audio',
      text: { family: 'sans', weight: 500, size: 22, tracking: 0, leading: 1.2, align: 'right', fit: 'fixed' } },
  ],
  variants: [
    // Variant 0: kicker top-left, headline fills middle
    {
      kicker:   { c: 0, cs: 6,  r: 0,  rs: 1  },
      headline: { c: 0, cs: 12, r: 2,  rs: 10 },
      footL:    { c: 0, cs: 4,  r: 15, rs: 1  },
      footR:    { c: 8, cs: 4,  r: 15, rs: 1  },
    },
    // Variant 1: kicker top-right, headline pushed down one row
    {
      kicker:   { c: 6, cs: 6,  r: 0,  rs: 1  },
      headline: { c: 0, cs: 12, r: 3,  rs: 10 },
      footL:    { c: 0, cs: 4,  r: 15, rs: 1  },
      footR:    { c: 8, cs: 4,  r: 15, rs: 1  },
    },
  ],
}

export default allType
