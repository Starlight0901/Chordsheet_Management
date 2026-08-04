import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CategorySelector, LanguageSelector } from '../taxonomy'
import type { HymnCategory, HymnLanguage } from '../../constants/taxonomy'
import {
  createChordSheet,
  listChordSheetsByHymn,
  reorderChordSheets,
} from '../../services/chordSheetService'
import {
  CloudinaryUploadError,
  toChordSheetFirestoreFields,
  uploadChordSheetImage,
} from '../../services/cloudinaryService'
import { requestChordSheetDeletion } from '../../services/deletionService'
import { createHymn, updateHymn } from '../../services/hymnService'
import type { ChordSheet, Hymn } from '../../types'
import { ChordSheetReorderList } from './ChordSheetReorderList'
import { DeleteChordSheetDialog } from './DeleteChordSheetDialog'
import { ImageUploader } from './ImageUploader'
import {
  chordSheetToFormItem,
  createNewChordSheetItem,
  revokePreviewUrl,
  withReindexedOrders,
  type ChordSheetFormItem,
  type ExistingChordSheetItem,
  type NewChordSheetItem,
} from './chordSheetFormTypes'

export interface HymnFormResult {
  hymn: Hymn
  chordSheets: ChordSheet[]
}

interface HymnFormProps {
  mode: 'create' | 'edit'
  userId: string
  hymn?: Hymn
  initialChordSheets?: ChordSheet[]
  onSuccess: (result: HymnFormResult) => void
  onCancel: () => void
}

function errorMessage(error: unknown): string {
  if (error instanceof CloudinaryUploadError || error instanceof Error) {
    return error.message
  }
  return 'Something went wrong. Please try again.'
}

async function uploadNewItem(
  item: NewChordSheetItem,
  hymnId: string,
  onProgress: (id: string, progress: number) => void,
): Promise<NewChordSheetItem> {
  if (item.uploadResult) {
    return { ...item, status: 'uploaded', progress: 100, error: null }
  }

  try {
    const result = await uploadChordSheetImage(item.file, {
      hymnId,
      onProgress: (progress) => onProgress(item.id, progress),
    })
    return {
      ...item,
      status: 'uploaded',
      progress: 100,
      error: null,
      uploadResult: result,
    }
  } catch (error) {
    return {
      ...item,
      status: 'error',
      error: errorMessage(error),
    }
  }
}

export function HymnForm({
  mode,
  userId,
  hymn,
  initialChordSheets = [],
  onSuccess,
  onCancel,
}: HymnFormProps) {
  const nameRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(hymn?.name ?? '')
  const [languages, setLanguages] = useState<HymnLanguage[]>(hymn?.languages ?? [])
  const [categories, setCategories] = useState<HymnCategory[]>(hymn?.categories ?? [])
  const [items, setItems] = useState<ChordSheetFormItem[]>(() =>
    withReindexedOrders(initialChordSheets.map(chordSheetToFormItem)),
  )
  const [activeHymnId, setActiveHymnId] = useState<string | undefined>(hymn?.id)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<ExistingChordSheetItem | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  useEffect(() => {
    return () => {
      items.forEach(revokePreviewUrl)
    }
    // Revoke object URLs only on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateItems(updater: (current: ChordSheetFormItem[]) => ChordSheetFormItem[]) {
    setItems((current) => withReindexedOrders(updater(current)))
  }

  function handleFilesSelected(files: File[]) {
    updateItems((current) => [
      ...current,
      ...files.map((file, index) => createNewChordSheetItem(file, current.length + index)),
    ])
  }

  function handleRemove(id: string) {
    const target = items.find((item) => item.id === id)
    if (!target) return

    if (target.kind === 'existing') {
      setDeleteTarget(target)
      setDeleteError(null)
      return
    }

    revokePreviewUrl(target)
    updateItems((current) => current.filter((item) => item.id !== id))
  }

  async function handleConfirmDelete(deletionPassword: string) {
    if (!deleteTarget) return

    setDeleteBusy(true)
    setDeleteError(null)

    try {
      await requestChordSheetDeletion({
        chordSheetId: deleteTarget.chordSheetId,
        deletionPassword,
      })
      updateItems((current) => current.filter((item) => item.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (error) {
      setDeleteError(errorMessage(error))
    } finally {
      setDeleteBusy(false)
    }
  }

  function setItemProgress(id: string, progress: number) {
    setItems((current) =>
      current.map((item) =>
        item.kind === 'new' && item.id === id
          ? { ...item, status: 'uploading', progress, error: null }
          : item,
      ),
    )
  }

  async function retryUpload(id: string) {
    const hymnId = activeHymnId
    if (!hymnId) {
      setFormError('Save the hymn first, then retry uploads.')
      return
    }

    const target = items.find((item): item is NewChordSheetItem => item.kind === 'new' && item.id === id)
    if (!target) return

    setItems((current) =>
      current.map((item) =>
        item.id === id && item.kind === 'new'
          ? { ...item, status: 'uploading', progress: 0, error: null, uploadResult: null }
          : item,
      ),
    )

    const uploaded = await uploadNewItem(
      { ...target, uploadResult: null, status: 'uploading', progress: 0, error: null },
      hymnId,
      setItemProgress,
    )
    setItems((current) =>
      withReindexedOrders(current.map((item) => (item.id === id ? uploaded : item))),
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setFormError('Hymn name is required.')
      return
    }
    if (languages.length === 0) {
      setFormError('Select at least one language.')
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      let savedHymn: Hymn

      if (!activeHymnId) {
        savedHymn = await createHymn({
          name: trimmed,
          languages,
          categories,
          createdBy: userId,
        })
        setActiveHymnId(savedHymn.id)
      } else {
        savedHymn = await updateHymn(activeHymnId, {
          name: trimmed,
          languages,
          categories,
        })
      }

      const hymnId = savedHymn.id
      let workingItems = [...items]
      const newItems = workingItems.filter((item): item is NewChordSheetItem => item.kind === 'new')

      if (newItems.length > 0) {
        setItems((current) =>
          current.map((item) =>
            item.kind === 'new' && !item.uploadResult
              ? { ...item, status: 'uploading', progress: 0, error: null }
              : item,
          ),
        )

        const uploadedNew: NewChordSheetItem[] = []
        for (const item of newItems) {
          const result = await uploadNewItem(item, hymnId, setItemProgress)
          uploadedNew.push(result)
          workingItems = workingItems.map((current) =>
            current.id === item.id ? result : current,
          )
          setItems(withReindexedOrders(workingItems))
        }

        const failed = uploadedNew.filter((item) => item.status === 'error')
        if (failed.length > 0) {
          setFormError(
            `${failed.length} image${failed.length === 1 ? '' : 's'} failed to upload. Retry failed uploads, then save again.`,
          )
          setSubmitting(false)
          return
        }
      }

      const toCreate = workingItems.filter(
        (item): item is NewChordSheetItem =>
          item.kind === 'new' && item.uploadResult !== null && item.status === 'uploaded',
      )

      for (const item of toCreate) {
        if (!item.uploadResult) continue
        const fields = toChordSheetFirestoreFields(item.uploadResult, {
          hymnId,
          order: item.order,
          uploadedBy: userId,
        })
        const created = await createChordSheet(fields)
        revokePreviewUrl(item)
        workingItems = workingItems.map((current) =>
          current.id === item.id ? chordSheetToFormItem(created) : current,
        )
        setItems(withReindexedOrders(workingItems))
      }

      const existingIds = workingItems
        .filter((item): item is ExistingChordSheetItem => item.kind === 'existing')
        .map((item) => item.chordSheetId)

      if (existingIds.length > 0) {
        await reorderChordSheets(existingIds)
      }

      const chordSheets = await listChordSheetsByHymn(hymnId)
      onSuccess({ hymn: savedHymn, chordSheets })
    } catch (error) {
      setFormError(errorMessage(error))
      setSubmitting(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="hymn-name" className="mb-2 block text-sm font-medium text-ink-200">
            Hymn name
          </label>
          <input
            ref={nameRef}
            id="hymn-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={submitting}
            placeholder="e.g. Amazing Grace"
            className="w-full rounded-xl border border-ink-600 bg-ink-900/60 px-3.5 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/30 disabled:opacity-60"
          />
        </div>

        <LanguageSelector value={languages} onChange={setLanguages} disabled={submitting} />
        <CategorySelector value={categories} onChange={setCategories} disabled={submitting} />

        <div>
          <div className="mb-3">
            <p className="text-sm font-medium text-ink-200">Chord sheets</p>
            <p className="mt-1 text-xs text-ink-400">
              Upload PNG or JPG images to Cloudinary. Drag to reorder. Images are not stored in
              Firestore.
            </p>
          </div>

          <ImageUploader onFilesSelected={handleFilesSelected} disabled={submitting} />

          {items.length > 0 && (
            <div className="mt-4">
              <ChordSheetReorderList
                items={items}
                onChange={setItems}
                onRemove={handleRemove}
                onRetry={(id) => void retryUpload(id)}
                disabled={submitting}
              />
            </div>
          )}
        </div>

        {formError && (
          <div className="rounded-xl border border-ember-500/40 bg-ember-500/10 px-3.5 py-3 text-sm text-ember-500">
            {formError}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-ink-700/60 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-xl border border-ink-600 px-4 py-2.5 text-sm text-ink-300 transition hover:bg-ink-700/50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gold-400 disabled:opacity-60"
          >
            {submitting
              ? mode === 'create'
                ? 'Creating…'
                : 'Saving…'
              : mode === 'create'
                ? 'Create hymn'
                : 'Save changes'}
          </button>
        </div>
      </form>

      <DeleteChordSheetDialog
        open={deleteTarget !== null}
        fileName={deleteTarget?.originalFileName ?? 'chord sheet'}
        busy={deleteBusy}
        error={deleteError}
        onCancel={() => {
          if (deleteBusy) return
          setDeleteTarget(null)
          setDeleteError(null)
        }}
        onConfirm={(password) => void handleConfirmDelete(password)}
      />
    </>
  )
}
