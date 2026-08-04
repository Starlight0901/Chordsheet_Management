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
import type {
  WorshipPlan,
  WorshipPlanCreateInput,
  WorshipPlanItem,
  WorshipPlanItemCreateInput,
  WorshipPlanItemUpdateInput,
  WorshipPlanUpdateInput,
} from '../types'
import {
  assertAuthUid,
  mapDoc,
  mapDocs,
  nullIfPermissionDenied,
  requireDb,
  withFirestoreError,
  type FirestoreUpdatePayload,
} from './firestoreHelpers'

const PLANS_COLLECTION = 'worshipPlans'
const ITEMS_COLLECTION = 'worshipPlanItems'

function validatePlanItemInput(input: WorshipPlanItemCreateInput): void {
  if (!input.planId.trim() || !input.userId.trim()) {
    throw new Error('planId and userId are required.')
  }

  if (input.type === 'hymn' && !input.hymnId?.trim()) {
    throw new Error('hymnId is required for hymn plan items.')
  }

  if (input.type === 'note' && !input.content?.trim()) {
    throw new Error('content is required for note plan items.')
  }
}

export async function createWorshipPlan(input: WorshipPlanCreateInput): Promise<WorshipPlan> {
  return withFirestoreError('Failed to create worship plan', async () => {
    const database = requireDb()
    const name = input.name.trim()
    const userId = assertAuthUid(input.userId, 'userId')

    if (!name) {
      throw new Error('Plan name is required.')
    }

    const ref = doc(collection(database, PLANS_COLLECTION))
    const payload: Record<string, unknown> = {
      userId,
      name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    if (input.description !== undefined) {
      payload.description = input.description
    }

    await setDoc(ref, payload)

    const snap = await getDoc(ref)
    const plan = mapDoc<WorshipPlan>(snap)
    if (!plan) {
      throw new Error('Worship plan was created but could not be loaded.')
    }
    return plan
  })
}

export async function getWorshipPlan(planId: string): Promise<WorshipPlan | null> {
  return withFirestoreError('Failed to get worship plan', async () => {
    return nullIfPermissionDenied(async () => {
      const database = requireDb()
      const snap = await getDoc(doc(database, PLANS_COLLECTION, planId))
      return mapDoc<WorshipPlan>(snap)
    })
  })
}

export async function listWorshipPlans(userId: string): Promise<WorshipPlan[]> {
  return withFirestoreError('Failed to list worship plans', async () => {
    const uid = assertAuthUid(userId, 'userId')
    const database = requireDb()
    const snap = await getDocs(
      query(
        collection(database, PLANS_COLLECTION),
        where('userId', '==', uid),
        orderBy('updatedAt', 'desc'),
      ),
    )
    return mapDocs<WorshipPlan>(snap.docs)
  })
}

export async function updateWorshipPlan(
  planId: string,
  input: WorshipPlanUpdateInput,
): Promise<WorshipPlan> {
  return withFirestoreError('Failed to update worship plan', async () => {
    const database = requireDb()
    const ref = doc(database, PLANS_COLLECTION, planId)
    const existing = await getDoc(ref)

    if (!existing.exists()) {
      throw new Error('Worship plan not found.')
    }

    const payload: FirestoreUpdatePayload = {
      updatedAt: serverTimestamp(),
    }

    if (input.name !== undefined) {
      const name = input.name.trim()
      if (!name) throw new Error('Plan name is required.')
      payload.name = name
    }
    if (input.description !== undefined) {
      payload.description = input.description
    }

    await updateDoc(ref, payload)

    const snap = await getDoc(ref)
    const plan = mapDoc<WorshipPlan>(snap)
    if (!plan) {
      throw new Error('Worship plan was updated but could not be loaded.')
    }
    return plan
  })
}

export async function deleteWorshipPlan(planId: string): Promise<void> {
  return withFirestoreError('Failed to delete worship plan', async () => {
    const database = requireDb()
    const planRef = doc(database, PLANS_COLLECTION, planId)
    const planSnap = await getDoc(planRef)
    const plan = mapDoc<WorshipPlan>(planSnap)
    if (!plan) {
      return
    }
    assertAuthUid(plan.userId, 'userId')

    const items = await getDocs(
      query(
        collection(database, ITEMS_COLLECTION),
        where('planId', '==', planId),
        where('userId', '==', plan.userId),
      ),
    )
    await Promise.all(items.docs.map((item) => deleteDoc(item.ref)))
    await deleteDoc(planRef)
  })
}

/** Duplicate a plan and all items for the same owner. Returns the new plan. */
export async function duplicateWorshipPlan(
  planId: string,
  userId: string,
): Promise<WorshipPlan> {
  return withFirestoreError('Failed to duplicate worship plan', async () => {
    const uid = assertAuthUid(userId, 'userId')

    const source = await getWorshipPlan(planId)
    if (!source) {
      throw new Error('Worship plan not found.')
    }
    if (source.userId !== uid) {
      throw new Error('You do not have access to this worship plan.')
    }

    const items = await listWorshipPlanItems(planId, uid)
    const copy = await createWorshipPlan({
      userId: uid,
      name: `Copy of ${source.name}`,
      description: source.description,
    })

    for (const item of items) {
      await addWorshipPlanItem({
        planId: copy.id,
        userId: uid,
        type: item.type,
        hymnId: item.hymnId,
        chordSheetId: item.chordSheetId,
        content: item.content,
        order: item.order,
      })
    }

    return copy
  })
}

/** All plan item refs for a user (for item counts on the plan list). */
export async function listAllUserWorshipPlanItems(userId: string): Promise<WorshipPlanItem[]> {
  return withFirestoreError('Failed to list user worship plan items', async () => {
    const uid = assertAuthUid(userId, 'userId')
    const database = requireDb()
    const snap = await getDocs(
      query(collection(database, ITEMS_COLLECTION), where('userId', '==', uid)),
    )
    return mapDocs<WorshipPlanItem>(snap.docs)
  })
}

/** Next order value for appending an item (does not create the item). */
export function nextWorshipPlanItemOrder(items: readonly WorshipPlanItem[]): number {
  if (items.length === 0) return 0
  return Math.max(...items.map((item) => item.order)) + 1
}

/** Persist explicit order values 0..n-1 for the given item ids (in display order). */
export async function reorderWorshipPlanItems(
  planId: string,
  orderedItemIds: readonly string[],
): Promise<void> {
  return withFirestoreError('Failed to reorder worship plan items', async () => {
    const database = requireDb()
    const batch = writeBatch(database)
    const now = serverTimestamp()
    orderedItemIds.forEach((itemId, index) => {
      batch.update(doc(database, ITEMS_COLLECTION, itemId), {
        order: index,
        updatedAt: now,
      })
    })
    if (planId.trim()) {
      batch.update(doc(database, PLANS_COLLECTION, planId), { updatedAt: now })
    }
    await batch.commit()
  })
}

export function moveOrderedWorshipItem<T>(
  items: readonly T[],
  fromIndex: number,
  toIndex: number,
): T[] {
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

export async function addWorshipPlanItem(
  input: WorshipPlanItemCreateInput,
): Promise<WorshipPlanItem> {
  return withFirestoreError('Failed to add worship plan item', async () => {
    const database = requireDb()
    const userId = assertAuthUid(input.userId, 'userId')
    validatePlanItemInput({ ...input, userId })

    const planSnap = await getDoc(doc(database, PLANS_COLLECTION, input.planId))
    const plan = mapDoc<WorshipPlan>(planSnap)
    if (!plan || plan.userId !== userId) {
      throw new Error('Worship plan not found.')
    }

    const ref = doc(collection(database, ITEMS_COLLECTION))
    const payload: Record<string, unknown> = {
      planId: input.planId,
      userId,
      type: input.type,
      order: input.order,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    if (input.hymnId !== undefined) payload.hymnId = input.hymnId
    if (input.chordSheetId !== undefined) payload.chordSheetId = input.chordSheetId
    if (input.content !== undefined) payload.content = input.content

    await setDoc(ref, payload)

    // Touch parent plan updatedAt
    await updateDoc(doc(database, PLANS_COLLECTION, input.planId), {
      updatedAt: serverTimestamp(),
    })

    const snap = await getDoc(ref)
    const item = mapDoc<WorshipPlanItem>(snap)
    if (!item) {
      throw new Error('Worship plan item was created but could not be loaded.')
    }
    return item
  })
}

export async function listWorshipPlanItems(
  planId: string,
  userId: string,
): Promise<WorshipPlanItem[]> {
  return withFirestoreError('Failed to list worship plan items', async () => {
    const uid = assertAuthUid(userId, 'userId')
    const database = requireDb()
    const snap = await getDocs(
      query(
        collection(database, ITEMS_COLLECTION),
        where('planId', '==', planId),
        where('userId', '==', uid),
        orderBy('order'),
      ),
    )
    return mapDocs<WorshipPlanItem>(snap.docs)
  })
}

export async function updateWorshipPlanItem(
  itemId: string,
  input: WorshipPlanItemUpdateInput,
): Promise<WorshipPlanItem> {
  return withFirestoreError('Failed to update worship plan item', async () => {
    const database = requireDb()
    const ref = doc(database, ITEMS_COLLECTION, itemId)
    const existing = await getDoc(ref)

    if (!existing.exists()) {
      throw new Error('Worship plan item not found.')
    }

    const payload: FirestoreUpdatePayload = {
      updatedAt: serverTimestamp(),
    }

    if (input.type !== undefined) payload.type = input.type
    if (input.hymnId !== undefined) payload.hymnId = input.hymnId
    if (input.chordSheetId !== undefined) payload.chordSheetId = input.chordSheetId
    if (input.content !== undefined) payload.content = input.content
    if (input.order !== undefined) payload.order = input.order

    await updateDoc(ref, payload)

    const current = mapDoc<WorshipPlanItem>(existing)
    if (current) {
      await updateDoc(doc(database, PLANS_COLLECTION, current.planId), {
        updatedAt: serverTimestamp(),
      })
    }

    const snap = await getDoc(ref)
    const item = mapDoc<WorshipPlanItem>(snap)
    if (!item) {
      throw new Error('Worship plan item was updated but could not be loaded.')
    }
    return item
  })
}

export async function removeWorshipPlanItem(itemId: string): Promise<void> {
  return withFirestoreError('Failed to remove worship plan item', async () => {
    const database = requireDb()
    const ref = doc(database, ITEMS_COLLECTION, itemId)
    const existing = await getDoc(ref)

    if (existing.exists()) {
      const item = mapDoc<WorshipPlanItem>(existing)
      await deleteDoc(ref)
      if (item) {
        await updateDoc(doc(database, PLANS_COLLECTION, item.planId), {
          updatedAt: serverTimestamp(),
        })
      }
      return
    }

    await deleteDoc(ref)
  })
}
