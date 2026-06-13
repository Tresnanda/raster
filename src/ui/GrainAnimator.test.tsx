// src/ui/GrainAnimator.test.tsx
import { test } from 'vitest'
import { render } from '@testing-library/react'
import { useRef } from 'react'
import { GrainAnimator } from './GrainAnimator'

function Wrapper({ enabled }: { enabled: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null)
  return (
    <>
      <svg ref={svgRef}>
        <defs>
          <filter id="raster-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={7} />
          </filter>
        </defs>
      </svg>
      <GrainAnimator svgRef={svgRef} enabled={enabled} />
    </>
  )
}

test('GrainAnimator mounts without error when enabled', () => {
  const { unmount } = render(<Wrapper enabled={true} />)
  unmount()
})

test('GrainAnimator mounts without error when disabled', () => {
  const { unmount } = render(<Wrapper enabled={false} />)
  unmount()
})
