// src/ui/GrainAnimator.tsx
import type React from 'react'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface GrainAnimatorProps {
  svgRef: React.RefObject<SVGSVGElement | null>
  enabled: boolean
}

/**
 * Animates the feTurbulence seed inside the SVG's #raster-grain filter when:
 *   - enabled is true (filmGrain on)
 *   - prefers-reduced-motion: no-preference
 * Throttled to ~10fps via gsap.delayedCall loop. Cleans up on unmount/toggle.
 * Returns null — renders no DOM, pure side-effect component.
 */
export function GrainAnimator({ svgRef, enabled }: GrainAnimatorProps) {
  const tickerRef = useRef<gsap.core.Tween | null>(null)
  const seedRef = useRef(7)

  useEffect(() => {
    if (!enabled) return

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return // reduced-motion: keep static seed, no animation

    let cancelled = false

    function tick() {
      if (cancelled) return
      const svg = svgRef.current
      if (!svg) {
        // Element not yet in DOM; retry on next tick
        tickerRef.current = gsap.delayedCall(0.1, tick)
        return
      }
      const turbulence = svg.querySelector<SVGFETurbulenceElement>('feTurbulence')
      if (turbulence) {
        seedRef.current = (seedRef.current + 1) % 999
        turbulence.setAttribute('seed', String(seedRef.current))
      }
      tickerRef.current = gsap.delayedCall(0.1, tick) // ~10fps
    }

    tick()

    return () => {
      cancelled = true
      if (tickerRef.current) {
        tickerRef.current.kill()
        tickerRef.current = null
      }
    }
  }, [enabled, svgRef])

  // Pure side-effect component — renders no DOM nodes.
  return null
}
