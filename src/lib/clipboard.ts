export async function copyTextToClipboard(text: string): Promise<boolean> {
  const clipboard = globalThis.navigator?.clipboard
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text)
      return true
    } catch {
      // Fall through to the legacy path for browsers or contexts that expose
      // Clipboard API but reject the write.
    }
  }

  if (!copyTextWithSelection(text)) return false
  if (!clipboard?.readText) return false

  try {
    return await clipboard.readText() === text
  } catch {
    return false
  }
}

function copyTextWithSelection(text: string): boolean {
  if (typeof document === 'undefined' || !document.body) return false

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '0'
  textarea.style.width = '1px'
  textarea.style.height = '1px'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'

  const selection = document.getSelection()
  const activeRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)

  let copied = false
  try {
    copied = typeof document.execCommand === 'function' && document.execCommand('copy')
  } catch {
    copied = false
  } finally {
    textarea.remove()
    if (selection && activeRange) {
      selection.removeAllRanges()
      selection.addRange(activeRange)
    }
  }

  return copied
}
