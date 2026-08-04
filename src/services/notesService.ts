import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import type { ChordSheetNote } from '../types'
import {
  assertAuthUid,
  compositeId,
  mapDoc,
  requireDb,
  withFirestoreError,
} from './firestoreHelpers'

const COLLECTION = 'chordSheetNotes'

/** Deterministic id: chordSheetNotes/{userId_chordSheetId} — one note per user per sheet. */
export function chordSheetNoteId(userId: string, chordSheetId: string): string {
  return compositeId(userId, chordSheetId)
}

/**
 * Direct document lookup. Missing note → null (not an error).
 */
export async function getChordSheetNote(
  userId: string,
  chordSheetId: string,
): Promise<ChordSheetNote | null> {
  return withFirestoreError('Failed to get chord sheet note', async () => {
    if (!chordSheetId.trim()) {
      return null
    }

    const uid = assertAuthUid(userId, 'userId')
    const database = requireDb()
    const snap = await getDoc(doc(database, COLLECTION, chordSheetNoteId(uid, chordSheetId)))

    if (!snap.exists()) {
      return null
    }

    return mapDoc<ChordSheetNote>(snap)
  })
}

/**
 * Creates or replaces the single personal note for a user + chord sheet.
 */
export async function upsertChordSheetNote(
  userId: string,
  chordSheetId: string,
  content: string,
): Promise<ChordSheetNote> {
  return withFirestoreError('Failed to save chord sheet note', async () => {
    const database = requireDb()
    const uid = assertAuthUid(userId, 'userId')

    if (!chordSheetId.trim()) {
      throw new Error('chordSheetId is required.')
    }

    const id = chordSheetNoteId(uid, chordSheetId)
    const ref = doc(database, COLLECTION, id)

    await setDoc(
      ref,
      {
        chordSheetId,
        userId: uid,
        content,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )

    const snap = await getDoc(ref)
    const note = mapDoc<ChordSheetNote>(snap)
    if (!note) {
      throw new Error('Note was saved but could not be loaded.')
    }
    return note
  })
}

export async function deleteChordSheetNote(userId: string, chordSheetId: string): Promise<void> {
  return withFirestoreError('Failed to delete chord sheet note', async () => {
    const uid = assertAuthUid(userId, 'userId')

    if (!chordSheetId.trim()) {
      throw new Error('chordSheetId is required.')
    }

    const database = requireDb()
    await deleteDoc(doc(database, COLLECTION, chordSheetNoteId(uid, chordSheetId)))
  })
}
