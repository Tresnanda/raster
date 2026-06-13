import { useDesign } from '../store/useDesign'

export function ImageInput({ slotId }: { slotId: string }) {
  const setContent = useDesign(s => s.setContent)
  const onFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => setContent(slotId, String(reader.result))
    reader.readAsDataURL(file)
  }
  return (
    <div className="space-y-2">
      <input type="file" accept="image/*"
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
      <input type="url" placeholder="or paste image URL" className="w-full border px-2 py-1 text-sm"
        onChange={e => setContent(slotId, e.target.value)} />
    </div>
  )
}
