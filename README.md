# Raster

A client-side auto-designer for Swiss/brutalist grid posters. Paste in text and images, pick an archetype, and Raster arranges everything on a strict 12-column grid. Shuffle to generate on-grid layout variations. Switch canvas formats. Export crisp PNG, JPG, or SVG (with embedded fonts).

**No backend. No database. No auth.** Everything runs in the browser; your work is autosaved to `localStorage` only.

---

## Development

```bash
pnpm dev      # start Vite dev server (http://localhost:5173)
pnpm test     # run all Vitest unit tests
pnpm build    # production build → dist/
```

Requires Node 18+ and pnpm 11.

---

## Deploying

Raster is a static SPA. `vercel.json` sets the build command, output directory, and security headers (CSP + `X-Content-Type-Options`). Push to Vercel — no server configuration needed.

---

## The 12 archetypes

Each archetype is a declarative slot layout with multiple shuffle variants:

| Archetype | Character |
|---|---|
| All-Type | Pure typography, no image |
| Editorial Grid | Classic magazine two-column with image |
| Full-Bleed Corners | Image fills the canvas, text anchored to corners |
| Glyph Frame | Oversized single character as structural frame |
| Grid Overlay Figure | Figure image with grid lines overlaid |
| Headline List | Stacked headline with numbered or bulleted list |
| Index Contents | Contents-page style index with running numbers |
| Mega Word | One word scaled to grid width |
| Modular Bento | Bento-box grid of content blocks |
| Number Feature | Large numeral as the hero element |
| Sidebar Rail | Narrow left/right rail with body text column |
| Split Diptych | Canvas split into two equal vertical panels |

---

## Stack

React 18, TypeScript, Vite, Tailwind v4, shadcn/ui, Zustand (state + localStorage), Vitest.

---

## What is deferred (not in v1)

- Resize handles in free-canvas mode (drag-move only)
- Content-preserving archetype switch
- PDF export
- Asset library / cloud storage
