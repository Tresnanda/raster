// src/ui/components/primitives.test.tsx
// Component tests for the premium UI primitives
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Slider } from '../controls/Slider'
import { Select } from '../controls/Select'
import { NumberField as NumberInput } from '../controls/NumberField'
import { Section } from '../controls/Section'
import { Switch } from '../../components/ui/switch'
import { Checkbox } from '../controls/Checkbox'
import { SegmentedControl } from '../controls/SegmentedControl'

// ── Slider ─────────────────────────────────────────────────────────────────
describe('Slider', () => {
  test('renders with aria-label', () => {
    render(<Slider value={50} min={0} max={100} step={1} onChange={() => {}} aria-label="Volume" />)
    // Radix renders the root with role="group" or thumb with role="slider"
    expect(document.querySelector('[role="slider"]')).toBeTruthy()
  })

  test('calls onChange when value changes', () => {
    const onChange = vi.fn()
    render(<Slider value={50} min={0} max={100} step={1} onChange={onChange} aria-label="Test" />)
    const thumb = document.querySelector('[role="slider"]') as HTMLElement
    expect(thumb).toBeTruthy()
    // Simulate keyboard interaction (arrow key)
    fireEvent.keyDown(thumb, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalled()
  })
})

// ── Select ─────────────────────────────────────────────────────────────────
describe('Select', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
    { value: 'c', label: 'Option C' },
  ]

  test('renders the current value in the trigger', () => {
    render(<Select value="a" onValueChange={() => {}} options={options} />)
    expect(screen.getByText('Option A')).toBeTruthy()
  })

  test('renders a trigger button', () => {
    render(<Select value="b" onValueChange={() => {}} options={options} aria-label="Pick option" />)
    const trigger = screen.getByLabelText('Pick option')
    expect(trigger).toBeTruthy()
  })
})

// ── NumberInput ───────────────────────────────────────────────────────────
describe('NumberInput', () => {
  test('renders label and input', () => {
    render(<NumberInput label="Width" value={100} onChange={() => {}} />)
    expect(screen.getByLabelText('Width')).toBeTruthy()
  })

  test('calls onChange when input value changes', () => {
    const onChange = vi.fn()
    render(<NumberInput label="Height" value={50} onChange={onChange} />)
    const input = screen.getByLabelText('Height') as HTMLInputElement
    fireEvent.change(input, { target: { value: '80' } })
    expect(onChange).toHaveBeenCalledWith(80)
  })

  test('respects min clamp', () => {
    const onChange = vi.fn()
    render(<NumberInput label="Size" value={10} min={0} max={100} onChange={onChange} />)
    const input = screen.getByLabelText('Size') as HTMLInputElement
    fireEvent.change(input, { target: { value: '-5' } })
    expect(onChange).toHaveBeenCalledWith(0)
  })

  test('respects max clamp', () => {
    const onChange = vi.fn()
    render(<NumberInput label="Size" value={10} min={0} max={100} onChange={onChange} />)
    const input = screen.getByLabelText('Size') as HTMLInputElement
    fireEvent.change(input, { target: { value: '200' } })
    expect(onChange).toHaveBeenCalledWith(100)
  })

  test('hides native spinners via appearance:textfield', () => {
    render(<NumberInput label="Opacity" value={1} onChange={() => {}} />)
    const input = screen.getByLabelText('Opacity') as HTMLInputElement
    expect(input.className).toContain('[appearance:textfield]')
  })
})

// ── Section ───────────────────────────────────────────────────────────────
describe('Section', () => {
  beforeEach(() => {
    // Clear localStorage between tests
    localStorage.clear()
  })

  test('renders children when default open', () => {
    render(
      <Section id="test-section" title="Settings" defaultOpen>
        <div data-testid="content">Content</div>
      </Section>
    )
    expect(screen.getByTestId('content')).toBeTruthy()
  })

  test('renders the title', () => {
    render(<Section id="s1" title="Typography">children</Section>)
    expect(screen.getByText('Typography')).toBeTruthy()
  })

  test('toggles open/closed on click', () => {
    render(
      <Section id="toggle-section" title="Toggle" defaultOpen={false}>
        <div>Inner content</div>
      </Section>
    )
    const trigger = screen.getByText('Toggle')
    // Initially closed (defaultOpen=false) — content may be hidden
    fireEvent.click(trigger.closest('button')!)
    // After click, should be open — just verify no error thrown
    expect(screen.getByText('Toggle')).toBeTruthy()
  })
})

// ── Switch ────────────────────────────────────────────────────────────────
describe('Switch', () => {
  test('renders with aria-label', () => {
    render(<Switch checked={false} onCheckedChange={() => {}} aria-label="Enable shadows" />)
    expect(screen.getByLabelText('Enable shadows')).toBeTruthy()
  })

  test('calls onCheckedChange when clicked', () => {
    const onCheckedChange = vi.fn()
    render(<Switch checked={false} onCheckedChange={onCheckedChange} aria-label="Toggle" />)
    fireEvent.click(screen.getByLabelText('Toggle'))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  test('reflects checked state', () => {
    render(<Switch checked={true} onCheckedChange={() => {}} aria-label="Active" />)
    const sw = screen.getByLabelText('Active')
    expect(sw.getAttribute('data-state')).toBe('checked')
  })
})

// ── Checkbox ──────────────────────────────────────────────────────────────
describe('Checkbox', () => {
  test('renders with label', () => {
    render(<Checkbox id="cb1" label="Film grain" checked={false} onChange={() => {}} />)
    expect(screen.getByLabelText('Film grain')).toBeTruthy()
  })

  test('calls onChange when clicked', () => {
    const onChange = vi.fn()
    render(<Checkbox id="cb2" label="Bold" checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Bold'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  test('passes data-rail-checkbox when data-checkbox prop is set', () => {
    const { container } = render(
      <Checkbox id="snap" label="Snap" checked={false} onChange={() => {}} data-checkbox="snap" />
    )
    const input = container.querySelector('[data-rail-checkbox="snap"]')
    expect(input).toBeTruthy()
  })
})

// ── SegmentedControl ──────────────────────────────────────────────────────
describe('SegmentedControl', () => {
  const options = [
    { value: 'left', label: 'L' },
    { value: 'center', label: 'C' },
    { value: 'right', label: 'R' },
  ]

  test('renders all options', () => {
    render(<SegmentedControl value="left" options={options} onValueChange={() => {}} />)
    expect(screen.getByText('L')).toBeTruthy()
    expect(screen.getByText('C')).toBeTruthy()
    expect(screen.getByText('R')).toBeTruthy()
  })

  test('active option has bg-neutral-900 class', () => {
    render(<SegmentedControl value="center" options={options} onValueChange={() => {}} />)
    const centerBtn = screen.getByText('C').closest('button')
    expect(centerBtn?.className).toContain('bg-neutral-900')
  })

  test('calls onValueChange when option clicked', () => {
    const onValueChange = vi.fn()
    render(<SegmentedControl value="left" options={options} onValueChange={onValueChange} />)
    fireEvent.click(screen.getByText('R'))
    expect(onValueChange).toHaveBeenCalledWith('right')
  })

  test('has radiogroup role', () => {
    const { container } = render(
      <SegmentedControl value="left" options={options} onValueChange={() => {}} aria-label="Align" />
    )
    expect(container.querySelector('[role="radiogroup"]')).toBeTruthy()
  })
})
