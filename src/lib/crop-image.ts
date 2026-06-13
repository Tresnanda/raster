/**
 * getCroppedDataUrl
 *
 * Loads `src` into an HTMLImageElement, draws the region described by
 * `pixelCrop` onto a fresh canvas, and resolves with a PNG dataURL.
 *
 * For cross-origin URLs the Image is fetched with crossOrigin="anonymous".
 * If the server does not send CORS headers the canvas becomes tainted and
 * toDataURL() throws — we catch that and fall back to returning the original
 * `src` string so the upload→crop flow never hard-fails.
 *
 * For data-URLs (local file uploads) there is no CORS issue and the crop
 * always succeeds.
 */
export interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

export async function getCroppedDataUrl(
  src: string,
  pixelCrop: PixelCrop,
): Promise<string> {
  const image = await loadImage(src)

  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    // Should never happen in a real browser
    return src
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  )

  try {
    return canvas.toDataURL('image/png')
  } catch {
    // Canvas is tainted (cross-origin image without CORS headers)
    // Fall back to the original URL so content is still set
    return src
  }
}

/** Load an Image from `src`, trying anonymous CORS first for https URLs. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()

    // Use crossOrigin for non-data URLs so we can call toDataURL on the canvas
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous'
    }

    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}
