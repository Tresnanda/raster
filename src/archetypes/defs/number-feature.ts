import type { ArchetypeDef } from '../schema'

// Archetype J — single giant number as the hero element.
const numberFeature: ArchetypeDef = {
  id: 'number-feature',
  name: 'Number Feature',
  ground: 'dark',
  slots: [
    { id: 'kicker', role: 'caption', placeholder: 'THE NUMBER',
      text: { family: 'sans', weight: 600, size: 26, tracking: 0.02, leading: 1.2, align: 'left', fit: 'fixed' } },
    { id: 'est', role: 'caption', placeholder: 'EST. 2024',
      text: { family: 'sans', weight: 600, size: 26, tracking: 0.02, leading: 1.2, align: 'right', fit: 'fixed' } },
    { id: 'number', role: 'headline', placeholder: '04',
      text: { family: 'display', weight: 900, size: 600, tracking: -0.04, leading: 0.85, align: 'center', fit: 'auto' } },
    { id: 'caption', role: 'subhead', placeholder: 'Four reasons to stay',
      text: { family: 'sans', weight: 500, size: 32, tracking: 0, leading: 1.15, align: 'center', fit: 'fixed' } },
  ],
  variants: [
    // Variant 0: kicker/est top row, giant number fills middle, caption below
    {
      kicker:  { c: 0, cs: 6,  r: 0,  rs: 1  },
      est:     { c: 8, cs: 4,  r: 0,  rs: 1  },
      number:  { c: 0, cs: 12, r: 3,  rs: 8  },
      caption: { c: 2, cs: 8,  r: 13, rs: 1  },
    },
    // Variant 1: number shifted up, caption close under, kicker/est at very bottom
    {
      kicker:  { c: 0, cs: 6,  r: 14, rs: 1  },
      est:     { c: 8, cs: 4,  r: 14, rs: 1  },
      number:  { c: 0, cs: 12, r: 1,  rs: 8  },
      caption: { c: 2, cs: 8,  r: 10, rs: 1  },
    },
  ],
}

export default numberFeature
