import type { ArchetypeDef } from '../schema'

// Archetype F — centered figure with headline overlaid on the image.
const gridOverlayFigure: ArchetypeDef = {
  id: 'grid-overlay-figure',
  name: 'Grid Overlay Figure',
  ground: 'light',
  slots: [
    { id: 'image', role: 'image', placeholder: '' },
    { id: 'headline', role: 'headline', placeholder: 'FIGURE',
      text: { family: 'display', weight: 800, size: 200, tracking: -0.02, leading: 0.9, align: 'center', fit: 'auto' } },
    { id: 'subhead', role: 'subhead', placeholder: 'A study in composition',
      text: { family: 'sans', weight: 500, size: 28, tracking: 0, leading: 1.15, align: 'center', fit: 'fixed' } },
    { id: 'mark', role: 'mark', placeholder: 'Grid',
      text: { family: 'sans', weight: 600, size: 20, tracking: 0.04, leading: 1.2, align: 'center', fit: 'fixed' } },
  ],
  variants: [
    // Variant 0: image center column, headline overlaid mid
    {
      image:    { c: 3, cs: 6,  r: 2,  rs: 11 },
      headline: { c: 1, cs: 10, r: 4,  rs: 4  },
      subhead:  { c: 2, cs: 8,  r: 9,  rs: 1  },
      mark:     { c: 5, cs: 2,  r: 15, rs: 1  },
    },
    // Variant 1: image wider, headline moved to upper quarter
    {
      image:    { c: 1, cs: 10, r: 3,  rs: 11 },
      headline: { c: 0, cs: 12, r: 0,  rs: 3  },
      subhead:  { c: 2, cs: 8,  r: 14, rs: 1  },
      mark:     { c: 5, cs: 2,  r: 15, rs: 1  },
    },
  ],
}

export default gridOverlayFigure
