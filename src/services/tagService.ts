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
import type { UserHymnTag, UserTag, UserTagCreateInput } from '../types'
import {
  assertAuthUid,
  compositeId,
  mapDoc,
  mapDocs,
  nullIfPermissionDenied,
  requireDb,
  withFirestoreError,
} from './firestoreHelpers'

const TAGS_COLLECTION = 'userTags'
const HYMN_TAGS_COLLECTION = 'userHymnTags'

export function userHymnTagId(userId: string, hymnId: string, tagId: string): string {
  return compositeId(userId, hymnId, tagId)
}

export async function createUserTag(input: UserTagCreateInput): Promise<UserTag> {
  return withFirestoreError('Failed to create tag', async () => {
    const database = requireDb()
    const name = input.name.trim()
    const userId = assertAuthUid(input.userId, 'userId')

    if (!name) {
      throw new Error('Tag name is required.')
    }

    const ref = doc(collection(database, TAGS_COLLECTION))
    await setDoc(ref, {
      userId,
      name,
      createdAt: serverTimestamp(),
    })

    const snap = await getDoc(ref)
    const tag = mapDoc<UserTag>(snap)
    if (!tag) {
      throw new Error('Tag was created but could not be loaded.')
    }
    return tag
  })
}

export async function getUserTag(tagId: string): Promise<UserTag | null> {
  return withFirestoreError('Failed to get tag', async () => {
    return nullIfPermissionDenied(async () => {
      const database = requireDb()
      const snap = await getDoc(doc(database, TAGS_COLLECTION, tagId))
      return mapDoc<UserTag>(snap)
    })
  })
}

export async function listUserTags(userId: string): Promise<UserTag[]> {
  return withFirestoreError('Failed to list tags', async () => {
    const uid = assertAuthUid(userId, 'userId')
    const database = requireDb()
    const snap = await getDocs(
      query(
        collection(database, TAGS_COLLECTION),
        where('userId', '==', uid),
        orderBy('name'),
      ),
    )
    return mapDocs<UserTag>(snap.docs)
  })
}

export async function renameUserTag(tagId: string, name: string): Promise<UserTag> {
  return withFirestoreError('Failed to rename tag', async () => {
    const database = requireDb()
    const trimmed = name.trim()
    if (!trimmed) {
      throw new Error('Tag name is required.')
    }

    const ref = doc(database, TAGS_COLLECTION, tagId)
    const existing = await getDoc(ref)
    if (!existing.exists()) {
      throw new Error('Tag not found.')
    }

    const current = mapDoc<UserTag>(existing)
    if (!current) {
      throw new Error('Tag not found.')
    }
    assertAuthUid(current.userId, 'userId')

    await setDoc(ref, { name: trimmed }, { merge: true })

    const snap = await getDoc(ref)
    const tag = mapDoc<UserTag>(snap)
    if (!tag) {
      throw new Error('Tag was renamed but could not be loaded.')
    }
    return tag
  })
}

export async function deleteUserTag(tagId: string): Promise<void> {
  return withFirestoreError('Failed to delete tag', async () => {
    const database = requireDb()
    const tagRef = doc(database, TAGS_COLLECTION, tagId)
    const tagSnap = await getDoc(tagRef)

    if (!tagSnap.exists()) {
      return
    }

    const tag = mapDoc<UserTag>(tagSnap)
    if (!tag) {
      return
    }
    assertAuthUid(tag.userId, 'userId')

    const links = await getDocs(
      query(
        collection(database, HYMN_TAGS_COLLECTION),
        where('userId', '==', tag.userId),
        where('tagId', '==', tagId),
      ),
    )

    await Promise.all(links.docs.map((link) => deleteDoc(link.ref)))
    await deleteDoc(tagRef)
  })
}

export async function assignTagToHymn(
  userId: string,
  hymnId: string,
  tagId: string,
): Promise<UserHymnTag> {
  return withFirestoreError('Failed to assign tag to hymn', async () => {
    const database = requireDb()
    const uid = assertAuthUid(userId, 'userId')

    if (!hymnId.trim() || !tagId.trim()) {
      throw new Error('hymnId and tagId are required.')
    }

    const id = userHymnTagId(uid, hymnId, tagId)
    const ref = doc(database, HYMN_TAGS_COLLECTION, id)
    const existing = await getDoc(ref)

    // Prefer create-only: setDoc on an existing doc is an update, which rules deny.
    if (!existing.exists()) {
      await setDoc(ref, {
        userId: uid,
        hymnId,
        tagId,
      })
    }

    const snap = existing.exists() ? existing : await getDoc(ref)
    const link = mapDoc<UserHymnTag>(snap)
    if (!link) {
      throw new Error('Tag assignment was saved but could not be loaded.')
    }
    return link
  })
}

export async function removeTagFromHymn(
  userId: string,
  hymnId: string,
  tagId: string,
): Promise<void> {
  return withFirestoreError('Failed to remove tag from hymn', async () => {
    const uid = assertAuthUid(userId, 'userId')
    const database = requireDb()
    await deleteDoc(doc(database, HYMN_TAGS_COLLECTION, userHymnTagId(uid, hymnId, tagId)))
  })
}

export async function listTagsForHymn(userId: string, hymnId: string): Promise<UserHymnTag[]> {
  return withFirestoreError('Failed to list hymn tags', async () => {
    const uid = assertAuthUid(userId, 'userId')
    const database = requireDb()
    const snap = await getDocs(
      query(
        collection(database, HYMN_TAGS_COLLECTION),
        where('userId', '==', uid),
        where('hymnId', '==', hymnId),
      ),
    )
    return mapDocs<UserHymnTag>(snap.docs)
  })
}

export async function listHymnsForTag(userId: string, tagId: string): Promise<UserHymnTag[]> {
  return withFirestoreError('Failed to list hymns for tag', async () => {
    const uid = assertAuthUid(userId, 'userId')
    const database = requireDb()
    const snap = await getDocs(
      query(
        collection(database, HYMN_TAGS_COLLECTION),
        where('userId', '==', uid),
        where('tagId', '==', tagId),
      ),
    )
    return mapDocs<UserHymnTag>(snap.docs)
  })
}

/** All personal hymn↔tag links for a user (for library filtering). */
export async function listAllUserHymnTags(userId: string): Promise<UserHymnTag[]> {
  return withFirestoreError('Failed to list user hymn tags', async () => {
    const uid = assertAuthUid(userId, 'userId')
    const database = requireDb()
    const snap = await getDocs(
      query(collection(database, HYMN_TAGS_COLLECTION), where('userId', '==', uid)),
    )
    return mapDocs<UserHymnTag>(snap.docs)
  })
}
