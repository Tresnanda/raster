import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { X } from 'lucide-react'
import { useDesign } from '../store/useDesign'
import { canvasFor } from '../design/formats'
import { slotBox } from '../lib/grid'
import { getCroppedDataUrl } from '../lib/crop-image'
import { Slider } from './controls/Slider'
import { Button } from '../components/ui/button'

/**
 * CropModal — mounted once in App.tsx, driven by store.cropRequest.
 *
 * When cropRequest is non-null the modal opens showing a react-easy-crop
 * cropper locked to the target slot's aspect ratio. On Apply the cropped
 * region is drawn onto an offscreen canvas and the resulting dataURL is
 * committed to the slot via setContent. On Cancel the request is cleared
 * with no side-effects.
 */
export function CropModal() {
  const design = useDesign(s => s.design)
  const cropRequest = useDesign(s => s.cropRequest)
  const placeImage = useDesign(s => s.placeImage)
  const cancelCrop = useDesign(s => s.cancelCrop)

  // react-easy-crop state
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const croppedAreaPixelsRef = useRef<Area | null>(null)
  const [applying, setApplying] = useState(false)

  // Refs for motion targets
  const backdropRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Reset crop position when a new request arrives
  useEffect(() => {
    if (cropRequest) {
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      croppedAreaPixelsRef.current = null
    }
  }, [cropRequest])

  // Close on Escape
  useEffect(() => {
    if (!cropRequest) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelCrop()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cropRequest, cancelCrop])

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    croppedAreaPixelsRef.current = pixels
  }, [])

  // ── Motion: modal entrance ────────────────────────────────────────────────
  useGSAP(() => {
    if (!backdropRef.current || !cardRef.current) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(backdropRef.current!, {
        opacity: 0,
        duration: 0.15,
        ease: 'none',
      })
      gsap.from(cardRef.current!, {
        scale: 0.96,
        opacity: 0,
        transformOrigin: '50% 50%',
        duration: 0.2,
        ease: 'power3.out',
        force3D: true,
      })
    })
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.from(backdropRef.current!, { opacity: 0, duration: 0.15, ease: 'none' })
    })
    return () => mm.revert()
  }, { scope: backdropRef, dependencies: [] })

  const handleApply = async () => {
    if (!cropRequest || applying) return
    const pixels = croppedAreaPixelsRef.current
    if (!pixels) return

    setApplying(true)
    try {
      const croppedUrl = await getCroppedDataUrl(cropRequest.src, pixels)
      placeImage(cropRequest.slotId, croppedUrl)
    } catch {
      placeImage(cropRequest.slotId, cropRequest.src)
    } finally {
      setApplying(false)
      cancelCrop()
    }
  }

  if (!cropRequest) return null

  const slot = design.slots.find(s => s.id === cropRequest.slotId)
  const canvas = canvasFor(design.format)
  const box = slot ? slotBox(canvas, design.grid, slot) : { w: 1, h: 1 }
  const aspect = box.w / box.h

  return (
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      aria-label="Crop image"
      className="fixed inset-0 z-[9999] bg-foreground/40 flex items-center justify-center"
      onClick={e => {
        if (e.target === e.currentTarget) cancelCrop()
      }}
    >
      {/* Modal card */}
      <div
        ref={cardRef}
        role="document"
        className="bg-background rounded-none border-2 border-foreground shadow-brutal w-[min(90vw,640px)] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b-2 border-foreground flex items-center justify-between">
          <span className="font-mono text-[11px] font-bold tracking-[0.12em] uppercase text-foreground">
            [ Crop Image ]
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            onClick={cancelCrop}
            className="border-transparent shadow-none"
          >
            <X size={14} strokeWidth={2.5} />
          </Button>
        </div>

        {/* Cropper area */}
        <div
          className="relative w-full bg-black min-h-[200px] max-h-[55vh]"
          style={{ aspectRatio: `${aspect}` }}
        >
          <Cropper
            image={cropRequest.src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{ containerStyle: { position: 'absolute', inset: 0 } }}
          />
        </div>

        {/* Zoom slider + actions */}
        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Zoom control */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-muted-foreground whitespace-nowrap w-10 shrink-0">
              Zoom
            </span>
            <Slider
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={setZoom}
              aria-label="Zoom"
              className="flex-1"
            />
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground w-9 text-right shrink-0">
              {zoom.toFixed(2)}x
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={cancelCrop}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleApply}
              disabled={applying}
            >
              {applying ? 'Applying…' : 'Apply'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
