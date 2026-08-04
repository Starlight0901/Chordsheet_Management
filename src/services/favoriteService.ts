import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import type { Favorite } from '../types'
import {
  assertAuthUid,
  compositeId,
  mapDoc,
  mapDocs,
  requireDb,
  withFirestoreError,
} from './firestoreHelpers'

const COLLECTION = 'favorites'

/** Deterministic id: favorites/{userId_hymnId} */
export function favoriteId(userId: string, hymnId: string): string {
  return compositeId(userId, hymnId)
}

export async function addFavorite(userId: string, hymnId: string): Promise<Favorite> {
  return withFirestoreError('Failed to add favorite', async () => {
    const database = requireDb()
    const uid = assertAuthUid(userId, 'userId')

    if (!hymnId.trim()) {
      throw new Error('hymnId is required.')
    }

    const id = favoriteId(uid, hymnId)
    const ref = doc(database, COLLECTION, id)
    const existing = await getDoc(ref)

    // Prefer create-only: setDoc on an existing doc is an update, which rules deny.
    if (!existing.exists()) {
      await setDoc(ref, {
        userId: uid,
        hymnId,
        createdAt: serverTimestamp(),
      })
    }

    const snap = existing.exists() ? existing : await getDoc(ref)
    const favorite = mapDoc<Favorite>(snap)
    if (!favorite) {
      throw new Error('Favorite was saved but could not be loaded.')
    }
    return favorite
  })
}

export async function removeFavorite(userId: string, hymnId: string): Promise<void> {
  return withFirestoreError('Failed to remove favorite', async () => {
    const database = requireDb()
    const uid = assertAuthUid(userId, 'userId')

    if (!hymnId.trim()) {
      throw new Error('hymnId is required.')
    }

    await deleteDoc(doc(database, COLLECTION, favoriteId(uid, hymnId)))
  })
}

/**
 * Direct document lookup — does not query.
 * Missing docs return false (rules must allow get on owner-scoped missing ids).
 */
export async function isFavorite(userId: string, hymnId: string): Promise<boolean> {
  return withFirestoreError('Failed to check favorite', async () => {
    const database = requireDb()
    const uid = assertAuthUid(userId, 'userId')

    if (!hymnId.trim()) {
      return false
    }

    const snap = await getDoc(doc(database, COLLECTION, favoriteId(uid, hymnId)))
    return snap.exists()
  })
}

export async function listFavorites(userId: string): Promise<Favorite[]> {
  return withFirestoreError('Failed to list favorites', async () => {
    const uid = assertAuthUid(userId, 'userId')
    const database = requireDb()

    const snap = await getDocs(
      query(
        collection(database, COLLECTION),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc'),
      ),
    )
    return mapDocs<Favorite>(snap.docs)
  })
}
