import type { ArchetypeDef } from '../schema'

// Archetype A — editorial grid: headline + meta + image + date + footer.
const editorialGrid: ArchetypeDef = {
  id: 'editorial-grid',
  name: 'Editorial Grid',
  ground: 'dark',
  slots: [
    { id: 'headline', role: 'headline', placeholder: 'THE GRID',
      text: { family: 'display', weight: 800, size: 76, tracking: -0.02, leading: 0.9, align: 'left', fit: 'auto' } },
    { id: 'meta', role: 'caption', placeholder: 'Vol. 04 / 2026',
      text: { family: 'sans', weight: 500, size: 22, tracking: 0.02, leading: 1.2, align: 'left', fit: 'fixed' } },
    { id: 'image', role: 'image', placeholder: '' },
    { id: 'imageCap', role: 'caption', placeholder: 'Figure 01 — Detail',
      text: { family: 'sans', weight: 500, size: 18, tracking: 0.01, leading: 1.2, align: 'left', fit: 'fixed' } },
    { id: 'date', role: 'date', placeholder: '2026',
      text: { family: 'display', weight: 800, size: 200, tracking: -0.03, leading: 0.85, align: 'left', fit: 'auto' } },
    { id: 'footerMark', role: 'mark', placeholder: 'EM',
      text: { family: 'sans', weight: 600, size: 20, tracking: 0.04, leading: 1.2, align: 'left', fit: 'fixed' } },
    { id: 'footer', role: 'caption', placeholder: 'Every city has a grid',
      text: { family: 'sans', weight: 500, size: 18, tracking: 0.01, leading: 1.2, align: 'left', fit: 'fixed' } },
  ],
  variants: [
    // Variant 0: headline top-left, date right column, image bottom-left
    {
      headline:    { c: 0, cs: 6, r: 0,  rs: 3 },
      meta:        { c: 8, cs: 4, r: 0,  rs: 2 },
      image:       { c: 0, cs: 5, r: 4,  rs: 7 },
      imageCap:    { c: 0, cs: 5, r: 11, rs: 1 },
      date:        { c: 6, cs: 6, r: 3,  rs: 6 },
      footerMark:  { c: 0, cs: 2, r: 14, rs: 1 },
      footer:      { c: 8, cs: 4, r: 14, rs: 2 },
    },
    // Variant 1: image moves to right column, headline top-right, date left column
    {
      headline:    { c: 6, cs: 6, r: 0,  rs: 3 },
      meta:        { c: 0, cs: 4, r: 0,  rs: 2 },
      image:       { c: 7, cs: 5, r: 4,  rs: 7 },
      imageCap:    { c: 7, cs: 5, r: 11, rs: 1 },
      date:        { c: 0, cs: 6, r: 3,  rs: 6 },
      footerMark:  { c: 10, cs: 2, r: 14, rs: 1 },
      footer:      { c: 0, cs: 4, r: 14, rs: 2 },
    },
  ],
}

export default editorialGrid
