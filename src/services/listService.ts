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
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { SYSTEM_LIST_NAMES } from '../constants/systemLists'
import type {
  SmartListFilter,
  UserList,
  UserListCreateInput,
  UserListItem,
  UserListItemCreateInput,
  UserListUpdateInput,
} from '../types'
import { sanitizeSmartListFilter } from '../utils/hymnFilters'
import {
  assertAuthUid,
  mapDoc,
  mapDocs,
  nullIfPermissionDenied,
  requireDb,
  withFirestoreError,
  type FirestoreUpdatePayload,
} from './firestoreHelpers'

const LISTS_COLLECTION = 'userLists'
const ITEMS_COLLECTION = 'userListItems'

export async function createUserList(input: UserListCreateInput): Promise<UserList> {
  return withFirestoreError('Failed to create list', async () => {
    const database = requireDb()
    const name = input.name.trim()
    const userId = assertAuthUid(input.userId, 'userId')

    if (!name) {
      throw new Error('List name is required.')
    }

    const ref = doc(collection(database, LISTS_COLLECTION))
    const listType = input.type ?? 'manual'
    const payload: Record<string, unknown> = {
      userId,
      name,
      type: listType,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    if (input.description !== undefined) {
      payload.description = input.description
    }

    if (listType === 'smart') {
      payload.filter = sanitizeSmartListFilter(input.filter)
    }

    await setDoc(ref, payload)

    const snap = await getDoc(ref)
    const list = mapDoc<UserList>(snap)
    if (!list) {
      throw new Error('List was created but could not be loaded.')
    }
    return list
  })
}

/** Coalesce concurrent seeds for the same user (login + auth effect + list pages). */
const ensureSystemListsInflight = new Map<string, Promise<UserList[]>>()

/**
 * Ensures each authenticated user has the default system lists.
 * Idempotent — creates only missing names for that user.
 * Concurrent callers for the same userId share one in-flight promise.
 */
export async function ensureSystemLists(userId: string): Promise<UserList[]> {
  if (!userId.trim()) {
    throw new Error('userId is required.')
  }

  const pending = ensureSystemListsInflight.get(userId)
  if (pending) return pending

  const run = withFirestoreError('Failed to ensure system lists', async () => {
    const existing = await listUserLists(userId)
    const byName = new Map(existing.map((list) => [list.name, list]))
    const created: UserList[] = []

    for (const name of SYSTEM_LIST_NAMES) {
      const found = byName.get(name)
      if (found) {
        if (found.type !== 'system') {
          await updateUserList(found.id, { type: 'system' })
          found.type = 'system'
        }
        created.push(found)
        continue
      }
      created.push(await createUserList({ userId, name, type: 'system' }))
    }

    return created
  }).finally(() => {
    ensureSystemListsInflight.delete(userId)
  })

  ensureSystemListsInflight.set(userId, run)
  return run
}

export async function getUserList(listId: string): Promise<UserList | null> {
  return withFirestoreError('Failed to get list', async () => {
    return nullIfPermissionDenied(async () => {
      const database = requireDb()
      const snap = await getDoc(doc(database, LISTS_COLLECTION, listId))
      return mapDoc<UserList>(snap)
    })
  })
}

export async function listUserLists(userId: string): Promise<UserList[]> {
  return withFirestoreError('Failed to list user lists', async () => {
    const uid = assertAuthUid(userId, 'userId')
    const database = requireDb()
    const snap = await getDocs(
      query(
        collection(database, LISTS_COLLECTION),
        where('userId', '==', uid),
        orderBy('name'),
      ),
    )
    return mapDocs<UserList>(snap.docs)
  })
}

/** Manual + system lists only (excludes smart lists). */
export async function listManualAndSystemLists(userId: string): Promise<UserList[]> {
  const lists = await listUserLists(userId)
  return sortUserLists(lists.filter((list) => list.type !== 'smart'))
}

/** Smart lists only — filter definitions, no stored hymn IDs. */
export async function listSmartLists(userId: string): Promise<UserList[]> {
  const lists = await listUserLists(userId)
  return lists
    .filter((list) => list.type === 'smart')
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

export async function createSmartList(input: {
  userId: string
  name: string
  description?: string
  filter: SmartListFilter
}): Promise<UserList> {
  return createUserList({
    userId: input.userId,
    name: input.name,
    description: input.description,
    type: 'smart',
    filter: sanitizeSmartListFilter(input.filter),
  })
}

/** Sort system lists in default order, then custom lists alphabetically. */
export function sortUserLists(lists: readonly UserList[]): UserList[] {
  const systemOrder = new Map<string, number>(
    SYSTEM_LIST_NAMES.map((name, index) => [name, index]),
  )

  return [...lists].sort((a, b) => {
    const aSystem = a.type === 'system'
    const bSystem = b.type === 'system'
    if (aSystem && bSystem) {
      return (systemOrder.get(a.name) ?? 999) - (systemOrder.get(b.name) ?? 999)
    }
    if (aSystem) return -1
    if (bSystem) return 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
}

export async function updateUserList(listId: string, input: UserListUpdateInput): Promise<UserList> {
  return withFirestoreError('Failed to update list', async () => {
    const database = requireDb()
    const ref = doc(database, LISTS_COLLECTION, listId)
    const existing = await getDoc(ref)

    if (!existing.exists()) {
      throw new Error('List not found.')
    }

    const current = mapDoc<UserList>(existing)
    if (!current) {
      throw new Error('List not found.')
    }
    if (current.type === 'system' && input.name !== undefined) {
      throw new Error('System lists cannot be renamed.')
    }
    if (input.filter !== undefined && current.type !== 'smart') {
      throw new Error('Only smart lists can have filters.')
    }

    const payload: FirestoreUpdatePayload = {
      updatedAt: serverTimestamp(),
    }

    if (input.name !== undefined) {
      const name = input.name.trim()
      if (!name) throw new Error('List name is required.')
      payload.name = name
    }
    if (input.description !== undefined) {
      payload.description = input.description
    }
    if (input.type !== undefined) {
      payload.type = input.type
    }
    if (input.filter !== undefined) {
      payload.filter = input.filter === null ? null : sanitizeSmartListFilter(input.filter)
    }

    await updateDoc(ref, payload)

    const snap = await getDoc(ref)
    const list = mapDoc<UserList>(snap)
    if (!list) {
      throw new Error('List was updated but could not be loaded.')
    }
    return list
  })
}

export async function deleteUserList(listId: string): Promise<void> {
  return withFirestoreError('Failed to delete list', async () => {
    const database = requireDb()
    const listRef = doc(database, LISTS_COLLECTION, listId)
    const listSnap = await getDoc(listRef)

    if (!listSnap.exists()) {
      return
    }

    const list = mapDoc<UserList>(listSnap)
    if (!list) {
      return
    }
    assertAuthUid(list.userId, 'userId')
    if (list.type === 'system') {
      throw new Error('System lists cannot be deleted.')
    }

    // Always scope by owner so foreign planted docs cannot break the query.
    const items = await getDocs(
      query(
        collection(database, ITEMS_COLLECTION),
        where('listId', '==', listId),
        where('userId', '==', list.userId),
      ),
    )
    await Promise.all(items.docs.map((item) => deleteDoc(item.ref)))
    await deleteDoc(listRef)
  })
}

export async function addListItem(input: UserListItemCreateInput): Promise<UserListItem> {
  return withFirestoreError('Failed to add list item', async () => {
    const database = requireDb()
    const userId = assertAuthUid(input.userId, 'userId')

    if (!input.listId.trim() || !input.hymnId.trim()) {
      throw new Error('listId and hymnId are required.')
    }

    const listSnap = await getDoc(doc(database, LISTS_COLLECTION, input.listId))
    const list = mapDoc<UserList>(listSnap)
    if (!list || list.userId !== userId) {
      throw new Error('List not found.')
    }
    if (list.type === 'smart') {
      throw new Error('Smart lists do not store hymn IDs. Update the filter instead.')
    }

    const ref = doc(collection(database, ITEMS_COLLECTION))
    await setDoc(ref, {
      listId: input.listId,
      userId,
      hymnId: input.hymnId,
      order: input.order,
      createdAt: serverTimestamp(),
    })

    const snap = await getDoc(ref)
    const item = mapDoc<UserListItem>(snap)
    if (!item) {
      throw new Error('List item was created but could not be loaded.')
    }
    return item
  })
}

/** Next order value for appending a hymn (does not create the item). */
export function nextListItemOrder(items: readonly UserListItem[]): number {
  if (items.length === 0) return 0
  return Math.max(...items.map((item) => item.order)) + 1
}

export async function listListItems(listId: string, userId: string): Promise<UserListItem[]> {
  return withFirestoreError('Failed to list list items', async () => {
    const uid = assertAuthUid(userId, 'userId')
    const database = requireDb()
    const snap = await getDocs(
      query(
        collection(database, ITEMS_COLLECTION),
        where('listId', '==', listId),
        where('userId', '==', uid),
        orderBy('order'),
      ),
    )
    return mapDocs<UserListItem>(snap.docs)
  })
}

/** All list item refs for a user (for hymn counts on My Lists). */
export async function listAllUserListItems(userId: string): Promise<UserListItem[]> {
  return withFirestoreError('Failed to list user list items', async () => {
    const uid = assertAuthUid(userId, 'userId')
    const database = requireDb()
    const snap = await getDocs(
      query(collection(database, ITEMS_COLLECTION), where('userId', '==', uid)),
    )
    return mapDocs<UserListItem>(snap.docs)
  })
}

export async function updateListItemOrder(itemId: string, order: number): Promise<UserListItem> {
  return withFirestoreError('Failed to update list item order', async () => {
    const database = requireDb()
    const ref = doc(database, ITEMS_COLLECTION, itemId)
    const existing = await getDoc(ref)

    if (!existing.exists()) {
      throw new Error('List item not found.')
    }

    await updateDoc(ref, { order })

    const snap = await getDoc(ref)
    const item = mapDoc<UserListItem>(snap)
    if (!item) {
      throw new Error('List item was updated but could not be loaded.')
    }
    return item
  })
}

/** Persist explicit order values 0..n-1 for the given item ids (in display order). */
export async function reorderListItems(orderedItemIds: readonly string[]): Promise<void> {
  return withFirestoreError('Failed to reorder list items', async () => {
    const database = requireDb()
    const batch = writeBatch(database)
    orderedItemIds.forEach((itemId, index) => {
      batch.update(doc(database, ITEMS_COLLECTION, itemId), { order: index })
    })
    await batch.commit()
  })
}

export async function removeListItem(itemId: string): Promise<void> {
  return withFirestoreError('Failed to remove list item', async () => {
    const database = requireDb()
    await deleteDoc(doc(database, ITEMS_COLLECTION, itemId))
  })
}

export function moveOrderedItem<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return [...items]
  }
  const next = [...items]
  const [removed] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, removed)
  return next
}
