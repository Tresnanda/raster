# Swiss Industrial Poster Rules

This guide turns Swiss grid and contemporary industrial poster references into
rules Raster's `Surprise` generator can score.

## Reference Families

### Classic Swiss Grid

Use for strict, light, editorial posters.

- Josef Mueller-Brockmann, MoMA collection:
  https://www.moma.org/artists/4154-josef-muller-brockmann
- Josef Mueller-Brockmann, Achte Sinfonie von Gustav Mahler:
  https://www.moma.org/collection/works/6357
- Poster House, The Swiss Grid:
  https://swissgrid.posterhouse.org/

Rules:

- Use a mathematical grid as the first composition decision.
- Favor asymmetric layouts, large negative space, and left-aligned ragged-right
  text.
- Use one dominant visual idea: a giant title, a geometric rhythm, or a single
  image relationship.
- Keep type hierarchy narrow: macro, supporting, micro.

### Photo And Type Contrast

Use for posters with image energy but Swiss typographic restraint.

- Armin Hofmann, Giselle, Cooper Hewitt:
  https://www.cooperhewitt.org/2018/08/05/aharmonyofcontrasts/

Rules:

- Let photography be organic and emotional; keep type measured and exact.
- Large type can cross a photograph when the contrast is high.
- Small text must sit on a calm field, never on busy image detail.

### Programmatic Systems

Use for generated posters that should feel designed from a repeatable system.

- Wim Crouwel, Stedelijk Museum, MoMA:
  https://www.moma.org/collection/works/8604
- Stedelijk Museum, Wim Crouwel "Mr. Gridnik":
  https://www.stedelijk.nl/en/news/wim-crouwel-mr-gridnik-2
- Karl Gerstner, Designing Programmes:
  https://runemadsen.com/blog/karl-gerstner-designing-programmes/

Rules:

- Pick a grammar before choosing slots.
- A grammar should define allowed zones, alignment rails, type scale, image
  treatment, and the one permitted expressive move.
- The result should look like it came from a system, not a random collage.

### Contemporary Industrial Swiss

Use for the darker, athletic, tactile direction in the pasted references.

- Stephen Kelman, Swiss Style A0 Poster Grid System:
  https://stephenkelman.co.uk/swiss-style-a0-poster-grid-system-for-indesign
- Design Reviewed, International Typographic Style:
  https://designreviewed.com/design-movement/international-typographic-style/

Rules:

- Dark substrate: near-black, white, one accent color.
- Light substrate: paper/off-white, black, optional red or blue accent.
- Allow grain, high contrast imagery, repeated type, giant glyphs, and hard
  bars, but only one disruptive gesture per poster.
- The disruptive gesture must still read as aligned to the grid.

## Generator Rules

1. Choose a named grammar first.
2. Permit at most one expressive violation per generated poster.
3. If the expressive violation is type occlusion, the occluding bar must align to
   the grid and cover no more than 35% of the dominant headline's grid area.
4. If a word is occluded, a readable dominant word or phrase must still remain.
5. Supporting text must not overlap images or occlusion bars.
6. Metadata clusters must snap to rails: top row, bottom row, left spine, or
   right column.
7. Use 2-3 type sizes only: macro, supporting, micro.
8. Use full-bleed imagery only with high-contrast macro type.
9. Use visible grid overlay sparingly; it is a specimen/reference move, not a
   default decoration.
10. Score posters down when the rule break looks accidental: too much occlusion,
    centered mush, missing supporting text, or too many competing gestures.

## Raster-Specific Scoring Targets

- `textOverlapCount`: always `0`.
- `nonFullBleedTextImageOverlaps`: always `0`.
- `titleCount`: exactly `1`.
- `supportingTextCount`: at least `1`.
- `expressiveMove`: `none` or one named move.
- `expressiveMoveCount`: never more than `1`.
- `occludedTitleFraction`: `0` unless `expressiveMove` is
  `controlled-occlusion`; then it must be `> 0` and `<= 0.35`.
