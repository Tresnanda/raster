import { useDesign } from '../store/useDesign'

export function ImageInput({ slotId }: { slotId: string }) {
  const requestCrop = useDesign(s => s.requestCrop)

  const onFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      // Phase C: route through CropModal instead of setting content directly
      requestCrop(slotId, String(reader.result))
    }
    reader.readAsDataURL(file)
  }

  const onUrl = (url: string) => {
    if (!url.trim()) return
    // Phase C: route URL through CropModal (react-easy-crop can display URLs;
    // getCroppedDataUrl handles CORS failures by falling back to the original URL)
    requestCrop(slotId, url.trim())
  }

  return (
    <div className="space-y-2">
      <input
        type="file"
        accept="image/*"
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <input
        type="url"
        placeholder="or paste image URL"
        className="w-full border px-2 py-1 text-sm"
        onBlur={e => onUrl(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onUrl((e.target as HTMLInputElement).value)
        }}
      />
    </div>
  )
}
