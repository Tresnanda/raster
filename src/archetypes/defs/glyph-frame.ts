import type { ArchetypeDef } from '../schema'

// Archetype E — oversized glyph/symbol + image + label corners.
const glyphFrame: ArchetypeDef = {
  id: 'glyph-frame',
  name: 'Glyph Frame',
  ground: 'light',
  slots: [
    { id: 'label', role: 'caption', placeholder: 'OBJECT 07',
      text: { family: 'sans', weight: 600, size: 20, tracking: 0.04, leading: 1.2, align: 'left', fit: 'fixed' } },
    { id: 'note', role: 'caption', placeholder: 'Study in form',
      text: { family: 'sans', weight: 500, size: 18, tracking: 0.01, leading: 1.2, align: 'right', fit: 'fixed' } },
    { id: 'glyph', role: 'glyph', placeholder: '◉',
      text: { family: 'display', weight: 900, size: 280, tracking: 0, leading: 0.9, align: 'left', fit: 'auto' } },
    { id: 'image', role: 'image', placeholder: '' },
    { id: 'mark', role: 'mark', placeholder: 'Studio',
      text: { family: 'sans', weight: 600, size: 20, tracking: 0.04, leading: 1.2, align: 'left', fit: 'fixed' } },
  ],
  variants: [
    // Variant 0: glyph top-left, image spanning bottom half
    {
      label: { c: 0, cs: 4,  r: 0,  rs: 1  },
      note:  { c: 8, cs: 4,  r: 0,  rs: 2  },
      glyph: { c: 0, cs: 6,  r: 2,  rs: 4  },
      image: { c: 1, cs: 10, r: 7,  rs: 7  },
      mark:  { c: 0, cs: 2,  r: 15, rs: 1  },
    },
    // Variant 1: glyph shifts to right half, image left half bottom
    {
      label: { c: 0, cs: 4,  r: 0,  rs: 1  },
      note:  { c: 8, cs: 4,  r: 0,  rs: 2  },
      glyph: { c: 6, cs: 6,  r: 2,  rs: 4  },
      image: { c: 1, cs: 10, r: 7,  rs: 7  },
      mark:  { c: 10, cs: 2, r: 15, rs: 1  },
    },
  ],
}

export default glyphFrame
