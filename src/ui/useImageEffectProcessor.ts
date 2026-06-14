// src/ui/useImageEffectProcessor.ts
//
// Mounted once in CanvasStage. Watches image slots for effect changes,
// debounces 120ms, runs applyImageEffect, then writes the result back
// via setProcessedImage (non-history write).
import { useEffect, useRef } from 'react'
import { useDesign } from '../store/useDesign'
import { applyImageEffect } from '../lib/image-effects'

export function useImageEffectProcessor(): void {
  const slots = useDesign(s => s.design.slots)
  const setProcessedImage = useDesign(s => s.setProcessedImage)
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const imageSlots = slots.filter(s => s.role === 'image')

    for (const slot of imageSlots) {
      const src = slot.imageSrcOriginal ?? slot.content
      if (!src) continue

      const effect = slot.imageEffect ?? { kind: 'none' as const, params: {} }
      const slotId = slot.id

      const existing = timers.current.get(slotId)
      if (existing) clearTimeout(existing)

      const timer = setTimeout(async () => {
        timers.current.delete(slotId)
        const result = await applyImageEffect(src, effect)
        setProcessedImage(slotId, result)
      }, 120)

      timers.current.set(slotId, timer)
    }
  }, [slots, setProcessedImage])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const t of timers.current.values()) clearTimeout(t)
    }
  }, [])
}
