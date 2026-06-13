import '@testing-library/jest-dom/vitest'

// jsdom does not implement canvas 2D; mock it so defaultMeasurer() works in component tests.
HTMLCanvasElement.prototype.getContext = function () {
  return {
    font: '',
    measureText: (text: string) => ({ width: text.length * 8 }),
    fillRect: () => {},
    clearRect: () => {},
  } as unknown as CanvasRenderingContext2D
} as unknown as typeof HTMLCanvasElement.prototype.getContext
