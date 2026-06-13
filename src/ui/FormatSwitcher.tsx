import type { Format } from '../types'
import { useDesign } from '../store/useDesign'
import { Tabs, TabsList, TabsTrigger } from './components/tabs'

const FORMATS: Format[] = ['4:5', '2:3', '9:16', '1:1', '16:9']

export function FormatSwitcher() {
  const format = useDesign(s => s.design.format)
  const setFormat = useDesign(s => s.setFormat)
  return (
    <Tabs value={format} onValueChange={v => setFormat(v as Format)}>
      <TabsList>{FORMATS.map(f => <TabsTrigger key={f} value={f}>{f}</TabsTrigger>)}</TabsList>
    </Tabs>
  )
}
