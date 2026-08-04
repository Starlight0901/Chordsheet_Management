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
import type { Hymn, HymnCreateInput, HymnUpdateInput } from '../types'
import { sanitizeCategories, sanitizeLanguages } from '../constants/taxonomy'
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

const COLLECTION = 'hymns'

function assertName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('Hymn name is required.')
  }
  return trimmed
}

export async function createHymn(input: HymnCreateInput): Promise<Hymn> {
  const createdBy = assertAuthUid(input.createdBy, 'createdBy')
  const database = requireDb()
  const ref = doc(collection(database, COLLECTION))
  const path = `${COLLECTION}/${ref.id}`

  return withLoggedFirestoreOp(
    {
      operation: 'createHymn (setDoc)',
      path,
      authUid: getAuthUid(),
    },
    async () => {
      await setDoc(ref, {
        name: assertName(input.name),
        languages: sanitizeLanguages(input.languages ?? []),
        categories: sanitizeCategories(input.categories ?? []),
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      const snap = await getDoc(ref)
      const hymn = mapDoc<Hymn>(snap)
      if (!hymn) {
        throw new Error('Hymn was created but could not be loaded.')
      }
      return hymn
    },
  )
}

export async function getHymn(hymnId: string): Promise<Hymn | null> {
  return withFirestoreError('Failed to get hymn', async () => {
    const database = requireDb()
    const snap = await getDoc(doc(database, COLLECTION, hymnId))
    return mapDoc<Hymn>(snap)
  })
}

export async function listHymns(): Promise<Hymn[]> {
  return withFirestoreError('Failed to list hymns', async () => {
    const database = requireDb()
    const snap = await getDocs(query(collection(database, COLLECTION), orderBy('name')))
    return mapDocs<Hymn>(snap.docs)
  })
}

export async function listHymnsByCreator(createdBy: string): Promise<Hymn[]> {
  return withFirestoreError('Failed to list hymns by creator', async () => {
    const database = requireDb()
    const snap = await getDocs(
      query(collection(database, COLLECTION), where('createdBy', '==', createdBy), orderBy('name')),
    )
    return mapDocs<Hymn>(snap.docs)
  })
}

export async function updateHymn(hymnId: string, input: HymnUpdateInput): Promise<Hymn> {
  const database = requireDb()
  const ref = doc(database, COLLECTION, hymnId)
  const path = `${COLLECTION}/${hymnId}`

  return withLoggedFirestoreOp(
    {
      operation: 'updateHymn (updateDoc)',
      path,
      authUid: getAuthUid(),
    },
    async () => {
      const existing = await getDoc(ref)

      if (!existing.exists()) {
        throw new Error('Hymn not found.')
      }

      const payload: FirestoreUpdatePayload = {
        updatedAt: serverTimestamp(),
      }

      if (input.name !== undefined) {
        payload.name = assertName(input.name)
      }
      if (input.languages !== undefined) {
        payload.languages = sanitizeLanguages(input.languages)
      }
      if (input.categories !== undefined) {
        payload.categories = sanitizeCategories(input.categories)
      }

      await updateDoc(ref, payload)

      const snap = await getDoc(ref)
      const hymn = mapDoc<Hymn>(snap)
      if (!hymn) {
        throw new Error('Hymn was updated but could not be loaded.')
      }
      return hymn
    },
  )
}

/**
 * Unprotected hymn delete — do not call from UI.
 * Use deleteHymnWithPassword from deletionService (accidental-deletion barrier).
 */
export async function deleteHymn(): Promise<void> {
  throw new Error('Use deleteHymnWithPassword — unprotected hymn delete is disabled.')
}
