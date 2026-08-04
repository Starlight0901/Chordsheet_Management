import type { CloudinaryUploadResult } from '../../services/cloudinaryService'
import type { ChordSheet } from '../../types'

export type NewChordSheetUploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error'

/** Existing Firestore chord sheet shown in the form/reorder list. */
export interface ExistingChordSheetItem {
  kind: 'existing'
  id: string
  chordSheetId: string
  imageUrl: string
  cloudinaryPublicId: string
  originalFileName: string
  order: number
}

/** Local file awaiting (or finishing) Cloudinary upload. */
export interface NewChordSheetItem {
  kind: 'new'
  id: string
  file: File
  previewUrl: string
  status: NewChordSheetUploadStatus
  progress: number
  error: string | null
  uploadResult: CloudinaryUploadResult | null
  order: number
}

export type ChordSheetFormItem = ExistingChordSheetItem | NewChordSheetItem

export function createLocalId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function chordSheetToFormItem(sheet: ChordSheet): ExistingChordSheetItem {
  return {
    kind: 'existing',
    id: sheet.id,
    chordSheetId: sheet.id,
    imageUrl: sheet.imageUrl,
    cloudinaryPublicId: sheet.cloudinaryPublicId,
    originalFileName: sheet.originalFileName,
    order: sheet.order,
  }
}

export function createNewChordSheetItem(file: File, order: number): NewChordSheetItem {
  return {
    kind: 'new',
    id: createLocalId(),
    file,
    previewUrl: URL.createObjectURL(file),
    status: 'idle',
    progress: 0,
    error: null,
    uploadResult: null,
    order,
  }
}

export function revokePreviewUrl(item: ChordSheetFormItem): void {
  if (item.kind === 'new' && item.previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(item.previewUrl)
  }
}

export function withReindexedOrders(items: ChordSheetFormItem[]): ChordSheetFormItem[] {
  return items.map((item, index) => ({ ...item, order: index }))
}

export function moveChordSheetItem(
  items: readonly ChordSheetFormItem[],
  fromIndex: number,
  toIndex: number,
): ChordSheetFormItem[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return [...items]
  }

  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  if (!moved) return [...items]
  next.splice(toIndex, 0, moved)
  return withReindexedOrders(next)
}

export function getPreviewSrc(item: ChordSheetFormItem): string {
  return item.kind === 'existing' ? item.imageUrl : item.previewUrl
}

export function getDisplayName(item: ChordSheetFormItem): string {
  if (item.kind === 'existing') return item.originalFileName
  return item.uploadResult?.originalFileName ?? item.file.name
}
