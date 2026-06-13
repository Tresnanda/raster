import type { ArchetypeDef } from '../schema'

// Archetype I — contents/index page with two images at the bottom.
const indexContents: ArchetypeDef = {
  id: 'index-contents',
  name: 'Index Contents',
  ground: 'light',
  slots: [
    { id: 'title', role: 'headline', placeholder: 'CONTENTS',
      text: { family: 'display', weight: 800, size: 140, tracking: -0.02, leading: 0.9, align: 'left', fit: 'auto' } },
    { id: 'rows', role: 'index', placeholder: '01 / Opening — p.4\n02 / Transit — p.12\n03 / Return — p.28',
      text: { family: 'mono', weight: 400, size: 22, tracking: 0, leading: 1.5, align: 'left', fit: 'fixed' } },
    { id: 'imageA', role: 'image', placeholder: '' },
    { id: 'imageB', role: 'image', placeholder: '' },
    { id: 'mark', role: 'mark', placeholder: 'Raster',
      text: { family: 'sans', weight: 600, size: 20, tracking: 0.04, leading: 1.2, align: 'left', fit: 'fixed' } },
  ],
  variants: [
    // Variant 0: title top, rows middle, two images bottom
    {
      title:  { c: 0, cs: 8,  r: 0,  rs: 2  },
      rows:   { c: 0, cs: 12, r: 3,  rs: 6  },
      imageA: { c: 0, cs: 6,  r: 10, rs: 4  },
      imageB: { c: 6, cs: 6,  r: 10, rs: 4  },
      mark:   { c: 0, cs: 2,  r: 15, rs: 1  },
    },
    // Variant 1: title right-aligned, images top, rows bottom
    {
      title:  { c: 4, cs: 8,  r: 0,  rs: 2  },
      rows:   { c: 0, cs: 12, r: 10, rs: 5  },
      imageA: { c: 0, cs: 6,  r: 3,  rs: 6  },
      imageB: { c: 6, cs: 6,  r: 3,  rs: 6  },
      mark:   { c: 10, cs: 2, r: 15, rs: 1  },
    },
  ],
}

export default indexContents
