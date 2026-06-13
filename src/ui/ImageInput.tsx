import { useRef, useState } from 'react'
import { Upload, Link } from 'lucide-react'
import { useDesign } from '../store/useDesign'

export function ImageInput({ slotId }: { slotId: string }) {
  const requestCrop = useDesign(s => s.requestCrop)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [urlValue, setUrlValue] = useState('')

  const onFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => requestCrop(slotId, String(reader.result))
    reader.readAsDataURL(file)
  }

  const onUrl = (url: string) => {
    if (!url.trim()) return
    requestCrop(slotId, url.trim())
    setUrlValue('')
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) onFile(file)
  }

  return (
    <div className="space-y-2">
      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}
      />

      {/* Custom dropzone */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        className={[
          'flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-4 py-4',
          'text-neutral-500 transition-colors duration-150',
          'hover:border-neutral-500 hover:text-neutral-700',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
          'active:scale-[0.97] transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
        ].join(' ')}
      >
        <Upload size={18} strokeWidth={1.5} />
        <span className="text-sm font-medium">Upload image</span>
        <span className="text-[11px] text-neutral-400">or drop a file</span>
      </button>

      {/* Styled URL input */}
      <div className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-neutral-900/10 transition-shadow duration-150">
        <Link size={13} className="shrink-0 text-neutral-400" />
        <input
          type="url"
          placeholder="Paste image URL"
          value={urlValue}
          className="min-w-0 flex-1 bg-transparent text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
          onChange={e => setUrlValue(e.target.value)}
          onBlur={e => onUrl(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onUrl((e.target as HTMLInputElement).value)
          }}
        />
      </div>
    </div>
  )
}
