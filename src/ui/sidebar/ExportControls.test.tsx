import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { ExportControls } from './ExportControls'
import { useDesign } from '../../store/useDesign'
import '../../archetypes/index'

beforeEach(() => {
  useDesign.getState().reset('mega-word', '4:5')
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: new URL('https://raster.test/workbench'),
  })
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: undefined,
  })
})

function mockExecCommand(result: boolean) {
  const execCommand = vi.fn().mockReturnValue(result)
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    value: execCommand,
  })
  return execCommand
}

test('Copy share link confirms success when Clipboard API writes', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
  const svgRef = createRef<SVGSVGElement>()

  render(<ExportControls svgRef={svgRef} />)
  fireEvent.click(screen.getByRole('button', { name: /copy share link/i }))

  await waitFor(() => expect(screen.getByLabelText('Link copied')).toBeInTheDocument())
  expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/raster\.test\/workbench#d=/))
})

test('Copy share link exposes a manual share URL when clipboard copy is blocked', async () => {
  mockExecCommand(true)
  const svgRef = createRef<SVGSVGElement>()

  render(<ExportControls svgRef={svgRef} />)
  fireEvent.click(screen.getByRole('button', { name: /copy share link/i }))

  await waitFor(() => expect(screen.getByLabelText('Copy failed')).toBeInTheDocument())
  const manualLink = screen.getByLabelText('Share link') as HTMLInputElement
  expect(manualLink.value).toMatch(/^https:\/\/raster\.test\/workbench#d=/)
})
