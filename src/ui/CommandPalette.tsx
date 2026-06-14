// src/ui/CommandPalette.tsx — ⌘K command palette
import type React from 'react'
import {
  Shuffle, Grid2x2, Asterisk, GitBranch, Type, Image as ImageIcon, Square, Minus,
  Undo2, Redo2, Download, Link2, Maximize, Scan, Eye, Contrast, Sparkle, Grid3x3,
} from 'lucide-react'
import { Play } from 'lucide-react'
import { useDesign } from '../store/useDesign'
import { exportRaster, exportSvg } from '../export/useExport'
import { buildShareUrl } from '../design/share'
import { playPosterMotion } from '../design/motion'
import { exportVideo, isVideoExportSupported } from '../export/video'
import { exportKit } from '../export/kit'
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from '../components/ui/command'
import type { Format } from '../types'

const FORMATS: Format[] = ['3:4', 'A4', '4:5', '1:1', '2:3', '9:16', '16:9']

export function CommandPalette({ svgRef }: { svgRef: React.RefObject<SVGSVGElement | null> }) {
  const open = useDesign(s => s.commandOpen)
  const setOpen = useDesign(s => s.setCommandOpen)

  // Run an action then close the palette.
  const run = (fn: () => void) => () => { fn(); setOpen(false) }

  const s = useDesign.getState
  const withSvg = (fn: (el: SVGSVGElement) => void) => () => {
    const el = svgRef.current
    if (el) fn(el)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Commands" description="Search actions">
      <CommandInput placeholder="Search commands…" />
      <CommandList>
        <CommandEmpty>No commands found.</CommandEmpty>

        <CommandGroup heading="Generate">
          <CommandItem onSelect={run(() => s().shuffle())}><Shuffle /> Shuffle layout</CommandItem>
          <CommandItem onSelect={run(() => s().pickForMe())}><Grid2x2 /> Pick a preset</CommandItem>
          <CommandItem onSelect={run(() => s().surprise())}><Asterisk /> Surprise — generate new</CommandItem>
          <CommandItem onSelect={run(() => s().openRiff())}><GitBranch /> Open Riff explorer</CommandItem>
        </CommandGroup>

        <CommandGroup heading="Add element">
          <CommandItem onSelect={run(() => s().addElement('text'))}><Type /> Add text</CommandItem>
          <CommandItem onSelect={run(() => s().addElement('image'))}><ImageIcon /> Add image</CommandItem>
          <CommandItem onSelect={run(() => s().addElement('block'))}><Square /> Add shape</CommandItem>
          <CommandItem onSelect={run(() => s().addElement('line'))}><Minus /> Add line</CommandItem>
        </CommandGroup>

        <CommandGroup heading="Canvas format">
          {FORMATS.map(f => (
            <CommandItem key={f} onSelect={run(() => s().setFormat(f))}>
              <Grid3x3 /> Format — {f}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Style">
          <CommandItem onSelect={run(() => s().setStyle({ bwImage: !s().design.style.bwImage }))}>
            <Contrast /> Toggle black &amp; white
          </CommandItem>
          <CommandItem onSelect={run(() => s().setStyle({ filmGrain: !s().design.style.filmGrain }))}>
            <Sparkle /> Toggle film grain
          </CommandItem>
          <CommandItem onSelect={run(() => s().setStyle({ gridOverlay: !s().design.style.gridOverlay }))}>
            <Grid2x2 /> Toggle grid overlay
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Edit">
          <CommandItem onSelect={run(() => s().undo())}><Undo2 /> Undo</CommandItem>
          <CommandItem onSelect={run(() => s().redo())}><Redo2 /> Redo</CommandItem>
          <CommandItem onSelect={run(() => s().selectElement(null))}><Eye /> Deselect</CommandItem>
        </CommandGroup>

        <CommandGroup heading="View">
          <CommandItem onSelect={run(() => { s().zoomToFit(); s().setPan({ x: 0, y: 0 }) })}><Maximize /> Zoom to fit</CommandItem>
          <CommandItem onSelect={run(() => { s().zoomTo100(); s().setPan({ x: 0, y: 0 }) })}><Scan /> Zoom 100%</CommandItem>
          <CommandItem onSelect={run(() => playPosterMotion(svgRef.current, s().motionEffect))}><Play /> Play text motion</CommandItem>
        </CommandGroup>

        <CommandGroup heading="Export & share">
          <CommandItem onSelect={run(withSvg(el => exportRaster(el, s().design, `raster-${s().design.layout}`, 'image/png')))}><Download /> Export PNG</CommandItem>
          <CommandItem onSelect={run(withSvg(el => exportRaster(el, s().design, `raster-${s().design.layout}`, 'image/jpeg')))}><Download /> Export JPG</CommandItem>
          <CommandItem onSelect={run(withSvg(el => exportSvg(el, `raster-${s().design.layout}`)))}><Download /> Export SVG</CommandItem>
          <CommandItem onSelect={run(() => { void exportKit(s().design) })}><Download /> Export kit (all formats)</CommandItem>
          <CommandItem onSelect={run(() => { navigator.clipboard?.writeText(buildShareUrl(s().design)) })}><Link2 /> Copy share link</CommandItem>
          {isVideoExportSupported() && (
            <CommandItem onSelect={run(() => { void exportVideo(svgRef.current, s().design, s().motionEffect) })}><Play /> Export animated video</CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
