import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import type { ChordSheet, ChordSheetCreateInput, ChordSheetUpdateInput } from '../types'
import {
  assertAuthUid,
  getAuthUid,
  mapDoc,
  mapDocs,
  requireDb,
  withFirestoreError,
  withLoggedFirestoreOp,
  type FirestoreUpdatePayload,
} from './firestoreHelpers'

const COLLECTION = 'chordSheets'

/**
 * Persists chord-sheet metadata only.
 * Callers must upload the image to Cloudinary first and pass the resulting URL / public id.
 */
export async function createChordSheet(input: ChordSheetCreateInput): Promise<ChordSheet> {
  const uploadedBy = assertAuthUid(input.uploadedBy, 'uploadedBy')

  if (!input.hymnId.trim()) {
    throw new Error('hymnId is required.')
  }
  if (!input.imageUrl.trim()) {
    throw new Error('imageUrl is required.')
  }
  if (!input.cloudinaryPublicId.trim()) {
    throw new Error('cloudinaryPublicId is required.')
  }

  const database = requireDb()
  const ref = doc(collection(database, COLLECTION))
  const path = `${COLLECTION}/${ref.id}`

  return withLoggedFirestoreOp(
    {
      operation: 'createChordSheet (setDoc)',
      path,
      authUid: getAuthUid(),
    },
    async () => {
      await setDoc(ref, {
        hymnId: input.hymnId,
        imageUrl: input.imageUrl,
        cloudinaryPublicId: input.cloudinaryPublicId,
        originalFileName: input.originalFileName || 'untitled',
        order: input.order,
        uploadedBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      const snap = await getDoc(ref)
      const sheet = mapDoc<ChordSheet>(snap)
      if (!sheet) {
        throw new Error('Chord sheet was created but could not be loaded.')
      }
      return sheet
    },
  )
}

export async function getChordSheet(sheetId: string): Promise<ChordSheet | null> {
  return withFirestoreError('Failed to get chord sheet', async () => {
    const database = requireDb()
    const snap = await getDoc(doc(database, COLLECTION, sheetId))
    return mapDoc<ChordSheet>(snap)
  })
}

export async function listChordSheetsByHymn(hymnId: string): Promise<ChordSheet[]> {
  return withFirestoreError('Failed to list chord sheets', async () => {
    const database = requireDb()
    const snap = await getDocs(
      query(collection(database, COLLECTION), where('hymnId', '==', hymnId), orderBy('order')),
    )
    return mapDocs<ChordSheet>(snap.docs)
  })
}

/** Returns chord-sheet counts keyed by hymnId for library list displays. */
export async function getChordSheetCountsByHymn(): Promise<Record<string, number>> {
  return withFirestoreError('Failed to count chord sheets', async () => {
    const database = requireDb()
    const snap = await getDocs(collection(database, COLLECTION))
    const counts: Record<string, number> = {}

    for (const docSnap of snap.docs) {
      const hymnId = docSnap.data().hymnId
      if (typeof hymnId !== 'string' || !hymnId) continue
      counts[hymnId] = (counts[hymnId] ?? 0) + 1
    }

    return counts
  })
}

export async function updateChordSheet(
  sheetId: string,
  input: ChordSheetUpdateInput,
): Promise<ChordSheet> {
  const database = requireDb()
  const ref = doc(database, COLLECTION, sheetId)
  const path = `${COLLECTION}/${sheetId}`

  return withLoggedFirestoreOp(
    {
      operation: 'updateChordSheet (updateDoc)',
      path,
      authUid: getAuthUid(),
    },
    async () => {
      const existing = await getDoc(ref)

      if (!existing.exists()) {
        throw new Error('Chord sheet not found.')
      }

      const payload: FirestoreUpdatePayload = {
        updatedAt: serverTimestamp(),
      }

      if (input.imageUrl !== undefined) payload.imageUrl = input.imageUrl
      if (input.cloudinaryPublicId !== undefined) payload.cloudinaryPublicId = input.cloudinaryPublicId
      if (input.originalFileName !== undefined) payload.originalFileName = input.originalFileName
      if (input.order !== undefined) payload.order = input.order

      await updateDoc(ref, payload)

      const snap = await getDoc(ref)
      const sheet = mapDoc<ChordSheet>(snap)
      if (!sheet) {
        throw new Error('Chord sheet was updated but could not be loaded.')
      }
      return sheet
    },
  )
}

/** Hard-delete chord-sheet metadata from Firestore. Prefer deletionService for password-gated UI. */
/**
 * Unprotected chord-sheet delete — do not call from UI.
 * Use deleteChordSheetWithPassword / requestChordSheetDeletion from deletionService.
 */
export async function deleteChordSheet(): Promise<void> {
  throw new Error('Use deleteChordSheetWithPassword — unprotected chord-sheet delete is disabled.')
}

/** Persist a new display order for chord sheets (0-based indices). */
export async function reorderChordSheets(
  orderedSheetIds: readonly string[],
): Promise<void> {
  return withFirestoreError('Failed to reorder chord sheets', async () => {
    if (orderedSheetIds.length === 0) return

    await Promise.all(
      orderedSheetIds.map((sheetId, index) => updateChordSheet(sheetId, { order: index })),
    )
  })
}
