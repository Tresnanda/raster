import type { ArchetypeDef } from '../schema'

// Archetype C — full-bleed image, one giant centered word, subhead + mark.
const megaWord: ArchetypeDef = {
  id: 'mega-word',
  name: 'Mega Word',
  ground: 'dark',
  slots: [
    { id: 'image', role: 'image', placeholder: '' },
    { id: 'word', role: 'headline', placeholder: 'ATL3',
      text: { family: 'display', weight: 800, size: 320, tracking: -0.03, leading: 0.8, align: 'center', fit: 'auto' } },
    { id: 'subhead', role: 'subhead', placeholder: 'How far can we push Inter with grids',
      text: { family: 'sans', weight: 500, size: 34, tracking: 0, leading: 1.15, align: 'center', fit: 'fixed' } },
    { id: 'mark', role: 'mark', placeholder: 'Essentials',
      text: { family: 'sans', weight: 600, size: 20, tracking: 0.04, leading: 1.2, align: 'center', fit: 'fixed' } },
  ],
  variants: [
    { image: { c: 0, cs: 12, r: 0, rs: 16 }, word: { c: 0, cs: 12, r: 6, rs: 4 },
      subhead: { c: 2, cs: 8, r: 11, rs: 1 }, mark: { c: 5, cs: 2, r: 14, rs: 1 } },
    { image: { c: 0, cs: 12, r: 0, rs: 16 }, word: { c: 0, cs: 12, r: 9, rs: 4 },
      subhead: { c: 1, cs: 10, r: 13, rs: 1 }, mark: { c: 5, cs: 2, r: 1, rs: 1 } },
  ],
}

export default megaWord
