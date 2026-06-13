import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { useDesign } from '../store/useDesign'
import { canvasFor } from '../design/formats'
import { slotBox } from '../lib/grid'
import { getCroppedDataUrl } from '../lib/crop-image'
import { Slider } from './components/slider'

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
  const setContent = useDesign(s => s.setContent)
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
  // Runs on mount (i.e., each time the modal becomes visible because CropModal
  // returns null when cropRequest is null, so mount === open).
  useGSAP(() => {
    if (!backdropRef.current || !cardRef.current) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Backdrop fade in
      gsap.from(backdropRef.current!, {
        opacity: 0,
        duration: 0.15,
        ease: 'none',
      })
      // Card scale from center
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
      // Reduced motion: just fade, no scale
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
      setContent(cropRequest.slotId, croppedUrl)
    } finally {
      setApplying(false)
      cancelCrop()
    }
  }

  if (!cropRequest) return null

  // Derive target aspect ratio from the slot's rendered box
  const slot = design.slots.find(s => s.id === cropRequest.slotId)
  const canvas = canvasFor(design.format)
  const box = slot ? slotBox(canvas, design.grid, slot) : { w: 1, h: 1 }
  const aspect = box.w / box.h

  return (
    // Backdrop
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      aria-label="Crop image"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.60)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={e => {
        // Close on backdrop click (not on card click)
        if (e.target === e.currentTarget) cancelCrop()
      }}
    >
      {/* Modal card */}
      <div
        ref={cardRef}
        role="document"
        style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
          width: 'min(90vw, 640px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#374151',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Crop Image
          </span>
          <button
            aria-label="Close"
            onClick={cancelCrop}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              fontSize: 18,
              lineHeight: 1,
              padding: '2px 4px',
              borderRadius: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Cropper area */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            // Height = width / aspect, clamped between reasonable bounds
            aspectRatio: `${aspect}`,
            minHeight: 200,
            maxHeight: '55vh',
            background: '#111',
          }}
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
        <div
          style={{
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Zoom control */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#9ca3af',
                fontFamily: "'Inter', sans-serif",
                whiteSpace: 'nowrap',
                width: 40,
                flexShrink: 0,
              }}
            >
              Zoom
            </span>
            <Slider
              min={1}
              max={3}
              step={0.01}
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              aria-label="Zoom"
            />
            <span
              style={{
                fontSize: 12,
                color: '#6b7280',
                fontFamily: "'Inter', 'Space Mono', monospace",
                fontVariantNumeric: 'tabular-nums',
                width: 36,
                textAlign: 'right',
                flexShrink: 0,
              }}
            >
              {zoom.toFixed(2)}x
            </span>
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
            }}
          >
            <button
              onClick={cancelCrop}
              style={{
                padding: '8px 18px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                background: '#fff',
                color: '#374151',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={applying}
              style={{
                padding: '8px 18px',
                border: 'none',
                borderRadius: 6,
                background: applying ? '#9ca3af' : '#111',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: applying ? 'default' : 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {applying ? 'Applying…' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
