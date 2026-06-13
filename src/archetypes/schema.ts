import type { GridCell, SlotRole, TextStyle } from '../types'

export interface SlotDef {
  id: string
  role: SlotRole
  /** default text content / placeholder; image roles use a placeholder flag. */
  placeholder: string
  text?: Partial<TextStyle>   // defaults for text roles
}

export type Variant = Record<string, GridCell>   // slotId -> cell

export interface ArchetypeDef {
  id: string
  name: string
  /** light vs dark default ground (drives default palette). */
  ground: 'light' | 'dark'
  slots: SlotDef[]
  variants: Variant[]   // [0] = default layout
}
