import type { ArchetypeDef } from '../schema'

// Archetype K — bento-grid layout with accent block, three images, headline, caption.
const modularBento: ArchetypeDef = {
  id: 'modular-bento',
  name: 'Modular Bento',
  ground: 'dark',
  slots: [
    { id: 'imageA', role: 'image', placeholder: '' },
    { id: 'block', role: 'block', placeholder: '' },
    { id: 'imageB', role: 'image', placeholder: '' },
    { id: 'headline', role: 'headline', placeholder: 'MODULE',
      text: { family: 'display', weight: 800, size: 120, tracking: -0.02, leading: 0.9, align: 'left', fit: 'auto' } },
    { id: 'imageC', role: 'image', placeholder: '' },
    { id: 'caption', role: 'caption', placeholder: 'Three panels, one story',
      text: { family: 'sans', weight: 500, size: 22, tracking: 0.01, leading: 1.3, align: 'left', fit: 'fixed' } },
  ],
  variants: [
    // Variant 0: imageA large top-left, block + imageB top-right, headline + images lower
    {
      imageA:   { c: 0, cs: 8, r: 0,  rs: 6  },
      block:    { c: 8, cs: 4, r: 0,  rs: 3  },
      imageB:   { c: 8, cs: 4, r: 3,  rs: 3  },
      headline: { c: 0, cs: 8, r: 7,  rs: 3  },
      imageC:   { c: 0, cs: 4, r: 11, rs: 4  },
      caption:  { c: 5, cs: 7, r: 11, rs: 3  },
    },
    // Variant 1: block top-left, imageA top-right large, headline bottom-left, imageB+C split bottom
    {
      imageA:   { c: 4, cs: 8, r: 0,  rs: 6  },
      block:    { c: 0, cs: 4, r: 0,  rs: 3  },
      imageB:   { c: 0, cs: 4, r: 3,  rs: 3  },
      headline: { c: 0, cs: 7, r: 7,  rs: 3  },
      imageC:   { c: 8, cs: 4, r: 11, rs: 4  },
      caption:  { c: 0, cs: 7, r: 11, rs: 3  },
    },
  ],
}

export default modularBento
