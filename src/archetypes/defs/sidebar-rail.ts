import type { ArchetypeDef } from '../schema'

// Archetype L — narrow left rail of vertical text labels + main image.
const sidebarRail: ArchetypeDef = {
  id: 'sidebar-rail',
  name: 'Sidebar Rail',
  ground: 'dark',
  slots: [
    { id: 'railTop', role: 'caption', placeholder: 'RASTER\nSTUDIO',
      text: { family: 'sans', weight: 600, size: 20, tracking: 0.04, leading: 1.2, align: 'left', fit: 'fixed' } },
    { id: 'railMid', role: 'caption', placeholder: 'VOL 04',
      text: { family: 'sans', weight: 600, size: 20, tracking: 0.04, leading: 1.2, align: 'left', fit: 'fixed' } },
    { id: 'railBot', role: 'mark', placeholder: 'EM',
      text: { family: 'sans', weight: 600, size: 20, tracking: 0.04, leading: 1.2, align: 'left', fit: 'fixed' } },
    { id: 'headline', role: 'headline', placeholder: 'MAIN STAGE',
      text: { family: 'display', weight: 800, size: 160, tracking: -0.02, leading: 0.9, align: 'left', fit: 'auto' } },
    { id: 'image', role: 'image', placeholder: '' },
  ],
  variants: [
    // Variant 0: left rail 3 cols, content right 8 cols
    {
      railTop:  { c: 0, cs: 3, r: 0,  rs: 3  },
      railMid:  { c: 0, cs: 3, r: 4,  rs: 2  },
      railBot:  { c: 0, cs: 3, r: 14, rs: 1  },
      headline: { c: 4, cs: 8, r: 0,  rs: 4  },
      image:    { c: 4, cs: 8, r: 5,  rs: 10 },
    },
    // Variant 1: right rail (cols 9-11), content left 8 cols
    {
      railTop:  { c: 9, cs: 3, r: 0,  rs: 3  },
      railMid:  { c: 9, cs: 3, r: 4,  rs: 2  },
      railBot:  { c: 9, cs: 3, r: 14, rs: 1  },
      headline: { c: 0, cs: 8, r: 0,  rs: 4  },
      image:    { c: 0, cs: 8, r: 5,  rs: 10 },
    },
  ],
}

export default sidebarRail
