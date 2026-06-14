import gsap from 'gsap'

/** Kinetic text-motion presets for the poster. Animate the SVG `[data-slot]`
 *  groups (and their lines) into place — the foundation for animate→video export. */
export type MotionEffect = 'rise' | 'wipe' | 'scale' | 'stagger' | 'roll'

export interface MotionSequence {
  effect: MotionEffect
  /** Playback speed as a percentage. 100 is normal. */
  tempo: number
  /** Delay before the first movement starts. */
  delayMs: number
  /** Time between animated slots/lines. */
  staggerMs: number
  /** Whether the preview should feel like a loop. Export still records one pass. */
  loop: boolean
}

export const DEFAULT_MOTION_SEQUENCE: MotionSequence = {
  effect: 'rise',
  tempo: 100,
  delayMs: 0,
  staggerMs: 80,
  loop: false,
}

export const MOTION_EFFECTS: { value: MotionEffect; label: string }[] = [
  { value: 'rise', label: 'Rise' },
  { value: 'wipe', label: 'Wipe' },
  { value: 'scale', label: 'Scale' },
  { value: 'stagger', label: 'Stagger' },
  { value: 'roll', label: 'Roll' },
]

const EASE = 'power3.out'

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function normalizeMotionSequence(sequence: Partial<MotionSequence> = {}): MotionSequence {
  return {
    effect: sequence.effect ?? DEFAULT_MOTION_SEQUENCE.effect,
    tempo: clamp(Math.round(sequence.tempo ?? DEFAULT_MOTION_SEQUENCE.tempo), 25, 200),
    delayMs: clamp(Math.round(sequence.delayMs ?? DEFAULT_MOTION_SEQUENCE.delayMs), 0, 2000),
    staggerMs: clamp(Math.round(sequence.staggerMs ?? DEFAULT_MOTION_SEQUENCE.staggerMs), 0, 300),
    loop: !!(sequence.loop ?? DEFAULT_MOTION_SEQUENCE.loop),
  }
}

export function motionSequenceDurationMs(sequence: MotionSequence, slotCount: number): number {
  const s = normalizeMotionSequence(sequence)
  const activeMs = Math.round(1000 * (100 / s.tempo))
  const staggerTotal = Math.max(0, slotCount - 1) * s.staggerMs
  return s.delayMs + activeMs + staggerTotal
}

/**
 * Build (and immediately play) a GSAP timeline that animates the poster's text
 * into place with the given effect. Returns the timeline so a video exporter can
 * drive it frame-by-frame. Honors prefers-reduced-motion (quick fade only).
 *
 * `svg` is the live <svg> element. We animate the `[data-slot]` groups; for the
 * finer effects we animate their `<text>`/`<tspan>` lines.
 */
export function playPosterMotion(
  svg: SVGSVGElement | null,
  effect: MotionEffect,
  opts: { paused?: boolean; sequence?: Partial<MotionSequence> } = {},
): gsap.core.Timeline | null {
  if (!svg) return null
  const groups = Array.from(svg.querySelectorAll<SVGGElement>('[data-slot]'))
  if (!groups.length) return null

  // Only animate groups that contain text (leave images/blocks settled).
  const textGroups = groups.filter(g => g.querySelector('text'))
  const targets = textGroups.length ? textGroups : groups

  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const sequence = normalizeMotionSequence({ ...opts.sequence, effect })
  const speed = 100 / sequence.tempo
  const stagger = sequence.staggerMs / 1000
  const tl = gsap.timeline({
    paused: !!opts.paused,
    delay: sequence.delayMs / 1000,
    repeat: sequence.loop && !opts.paused ? -1 : 0,
  })

  if (reduce) {
    tl.from(targets, { opacity: 0, duration: 0.25 * speed, stagger: Math.min(stagger, 0.08) })
    return tl
  }

  switch (effect) {
    case 'rise':
      tl.from(targets, {
        yPercent: 40, opacity: 0, duration: 0.65 * speed, ease: EASE, stagger, force3D: true,
      })
      break

    case 'scale':
      tl.from(targets, {
        scale: 0.86, opacity: 0, transformOrigin: '50% 50%',
        duration: 0.6 * speed, ease: EASE, stagger, force3D: true,
      })
      break

    case 'wipe':
      // Reveal each block left→right via a clip-path inset wipe.
      tl.fromTo(
        targets,
        { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 0% 0 0)', duration: 0.6 * speed, ease: EASE, stagger },
      )
      break

    case 'stagger': {
      // Per-line stagger: animate each <tspan> across all text groups.
      const lines = svg.querySelectorAll<SVGElement>('[data-slot] tspan')
      const lineTargets = lines.length ? Array.from(lines) : targets
      tl.from(lineTargets, {
        yPercent: 60, opacity: 0, duration: 0.5 * speed, ease: EASE, stagger: Math.min(stagger, 0.08), force3D: true,
      })
      break
    }

    case 'roll':
      // SVG can't do a true per-character odometer roll cleanly, so we emulate the
      // slot-text feel: a fast vertical roll-in with a slight blur settle.
      tl.from(targets, {
        yPercent: 100, opacity: 0, filter: 'blur(4px)',
        duration: 0.5 * speed, ease: 'power4.out', stagger, force3D: true,
      })
      break
  }

  return tl
}
