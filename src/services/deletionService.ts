import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  type QueryConstraint,
} from 'firebase/firestore'
import { verifyDeletionPassword } from '../config/deletionConfig'
import { auth } from '../firebase/config'
import { getAuthUid, requireDb, withFirestoreError } from './firestoreHelpers'

export class DeletionServiceError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'DeletionServiceError'
    this.code = code
  }
}

function assertDeletionPassword(deletionPassword: string): void {
  if (!deletionPassword.trim()) {
    throw new DeletionServiceError('Deletion password is required.', 'invalid-argument')
  }
  if (!verifyDeletionPassword(deletionPassword)) {
    throw new DeletionServiceError('Invalid deletion password.', 'permission-denied')
  }
}

function requireSignedInUid(): string {
  const uid = getAuthUid() ?? auth?.currentUser?.uid ?? null
  if (!uid) {
    throw new DeletionServiceError('You must be signed in to delete.', 'unauthenticated')
  }
  return uid
}

async function deleteMatchingDocs(
  collectionName: string,
  ...constraints: QueryConstraint[]
): Promise<number> {
  const database = requireDb()
  const snap = await getDocs(query(collection(database, collectionName), ...constraints))
  if (snap.empty) return 0

  let deleted = 0
  let batch = writeBatch(database)
  let ops = 0

  for (const docSnap of snap.docs) {
    batch.delete(docSnap.ref)
    ops += 1
    deleted += 1
    if (ops >= 450) {
      await batch.commit()
      batch = writeBatch(database)
      ops = 0
    }
  }

  if (ops > 0) {
    await batch.commit()
  }

  return deleted
}

/**
 * Delete a chord sheet's Firestore metadata and the current user's related refs.
 *
 * Does NOT delete the Cloudinary image (no privileged credentials on the client).
 * Unused Cloudinary assets may be cleaned up manually in the Cloudinary dashboard.
 *
 * Local password check is an accidental-deletion barrier only — not true security.
 */
export async function deleteChordSheetWithPassword(input: {
  chordSheetId: string
  deletionPassword: string
}): Promise<{ ok: true; chordSheetId: string; hymnId: string }> {
  assertDeletionPassword(input.deletionPassword)
  const uid = requireSignedInUid()
  const chordSheetId = input.chordSheetId.trim()
  if (!chordSheetId) {
    throw new DeletionServiceError('chordSheetId is required.', 'invalid-argument')
  }

  return withFirestoreError('Failed to delete chord sheet', async () => {
    const database = requireDb()
    const sheetRef = doc(database, 'chordSheets', chordSheetId)
    const direct = await getDoc(sheetRef)
    if (!direct.exists()) {
      throw new DeletionServiceError('Chord sheet not found.', 'not-found')
    }

    const hymnId = String(direct.data().hymnId ?? '')

    await deleteMatchingDocs(
      'chordSheetNotes',
      where('userId', '==', uid),
      where('chordSheetId', '==', chordSheetId),
    )
    await deleteMatchingDocs(
      'worshipPlanItems',
      where('userId', '==', uid),
      where('chordSheetId', '==', chordSheetId),
    )

    await deleteDoc(sheetRef)

    return { ok: true as const, chordSheetId, hymnId }
  })
}

/**
 * Delete a hymn, all chord-sheet metadata for it, and the current user's related refs.
 *
 * Does NOT delete Cloudinary images. Assets may remain unused after metadata removal.
 *
 * Local password check is an accidental-deletion barrier only — not true security.
 */
export async function deleteHymnWithPassword(input: {
  hymnId: string
  deletionPassword: string
}): Promise<{ ok: true; hymnId: string; chordSheetsDeleted: number }> {
  assertDeletionPassword(input.deletionPassword)
  const uid = requireSignedInUid()
  const hymnId = input.hymnId.trim()
  if (!hymnId) {
    throw new DeletionServiceError('hymnId is required.', 'invalid-argument')
  }

  return withFirestoreError('Failed to delete hymn', async () => {
    const database = requireDb()
    const hymnRef = doc(database, 'hymns', hymnId)
    const hymnSnap = await getDoc(hymnRef)
    if (!hymnSnap.exists()) {
      throw new DeletionServiceError('Hymn not found.', 'not-found')
    }

    const sheetsSnap = await getDocs(
      query(collection(database, 'chordSheets'), where('hymnId', '==', hymnId)),
    )

    for (const sheetDoc of sheetsSnap.docs) {
      const sheetId = sheetDoc.id
      await deleteMatchingDocs(
        'chordSheetNotes',
        where('userId', '==', uid),
        where('chordSheetId', '==', sheetId),
      )
      await deleteMatchingDocs(
        'worshipPlanItems',
        where('userId', '==', uid),
        where('chordSheetId', '==', sheetId),
      )
      await deleteDoc(sheetDoc.ref)
    }

    await deleteMatchingDocs('favorites', where('userId', '==', uid), where('hymnId', '==', hymnId))
    await deleteMatchingDocs(
      'userListItems',
      where('userId', '==', uid),
      where('hymnId', '==', hymnId),
    )
    await deleteMatchingDocs(
      'userHymnTags',
      where('userId', '==', uid),
      where('hymnId', '==', hymnId),
    )
    await deleteMatchingDocs(
      'worshipPlanItems',
      where('userId', '==', uid),
      where('hymnId', '==', hymnId),
    )

    await deleteDoc(hymnRef)

    return {
      ok: true as const,
      hymnId,
      chordSheetsDeleted: sheetsSnap.size,
    }
  })
}

/** Alias used by HymnForm chord-sheet delete. */
export async function requestChordSheetDeletion(input: {
  chordSheetId: string
  deletionPassword: string
}): Promise<{ ok: true; chordSheetId: string; hymnId: string }> {
  return deleteChordSheetWithPassword(input)
}
