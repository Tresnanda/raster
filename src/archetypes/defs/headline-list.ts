import type { ArchetypeDef } from '../schema'

// Archetype B — headline + index list + image lower half.
const headlineList: ArchetypeDef = {
  id: 'headline-list',
  name: 'Headline List',
  ground: 'dark',
  slots: [
    { id: 'headline', role: 'headline', placeholder: 'SEASON FOUR',
      text: { family: 'display', weight: 800, size: 140, tracking: -0.02, leading: 0.9, align: 'left', fit: 'auto' } },
    { id: 'date', role: 'date', placeholder: 'AUG 2026',
      text: { family: 'display', weight: 800, size: 56, tracking: -0.02, leading: 0.9, align: 'left', fit: 'auto' } },
    { id: 'list', role: 'index', placeholder: '01 Opening\n02 Transit\n03 Return',
      text: { family: 'mono', weight: 400, size: 22, tracking: 0, leading: 1.4, align: 'left', fit: 'fixed' } },
    { id: 'image', role: 'image', placeholder: '' },
  ],
  variants: [
    // Variant 0: headline + date stacked left, list right, image spanning lower
    {
      headline: { c: 0, cs: 7, r: 0, rs: 3 },
      date:     { c: 0, cs: 7, r: 3, rs: 3 },
      list:     { c: 8, cs: 4, r: 0, rs: 7 },
      image:    { c: 2, cs: 8, r: 9, rs: 6 },
    },
    // Variant 1: image on top (shrunk to rs:7 for breathing room), headline + date + list below
    {
      headline: { c: 0, cs: 7, r: 9,  rs: 3 },
      date:     { c: 0, cs: 7, r: 12, rs: 2 },
      list:     { c: 8, cs: 4, r: 9,  rs: 4 },
      image:    { c: 0, cs: 12, r: 0, rs: 7 },
    },
  ],
}

export default headlineList
