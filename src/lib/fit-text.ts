export type Measurer = (text: string, size: number) => number  // returns px width

export interface FitOpts { maxSize: number; minSize: number; leading: number }
export interface FitResult { size: number; lines: string[] }

function wrap(text: string, size: number, maxW: number, measure: Measurer): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const word of words) {
    const trial = cur ? cur + ' ' + word : word
    if (measure(trial, size) <= maxW || !cur) cur = trial
    else { lines.push(cur); cur = word }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : ['']
}

function fits(lines: string[], size: number, box: { w: number; h: number }, leading: number, measure: Measurer): boolean {
  const widthOk = lines.every(l => measure(l, size) <= box.w)
  const heightOk = lines.length * size * leading <= box.h
  return widthOk && heightOk
}

export function fitText(text: string, box: { w: number; h: number }, opts: FitOpts, measure: Measurer): FitResult {
  for (let size = opts.maxSize; size >= opts.minSize; size -= 1) {
    const lines = wrap(text, size, box.w, measure)
    if (fits(lines, size, box, opts.leading, measure)) return { size, lines }
  }
  const lines = wrap(text, opts.minSize, box.w, measure)
  return { size: opts.minSize, lines }
}
