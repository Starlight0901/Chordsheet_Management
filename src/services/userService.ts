import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import type { UserProfile } from '../types'
import {
  assertAuthUid,
  requireDb,
  withFirestoreError,
  type FirestoreUpdatePayload,
} from './firestoreHelpers'

const COLLECTION = 'users'

export type { UserProfile }

function toUserProfile(uid: string, data: Record<string, unknown> | undefined): UserProfile | null {
  if (!data) {
    return null
  }

  return {
    uid,
    displayName: (data.displayName as string | null | undefined) ?? null,
    email: (data.email as string | null | undefined) ?? null,
    photoURL: (data.photoURL as string | null | undefined) ?? null,
    createdAt: (data.createdAt as UserProfile['createdAt']) ?? null,
    updatedAt: (data.updatedAt as UserProfile['updatedAt']) ?? null,
  }
}

export async function upsertUserProfile(user: User): Promise<UserProfile> {
  return withFirestoreError('Failed to save user profile', async () => {
    const database = requireDb()
    const uid = assertAuthUid(user.uid, 'uid')
    const userRef = doc(database, COLLECTION, uid)
    const existing = await getDoc(userRef)

    const profile: Record<string, unknown> = {
      uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      updatedAt: serverTimestamp(),
    }

    if (!existing.exists()) {
      profile.createdAt = serverTimestamp()
    }

    await setDoc(userRef, profile, { merge: true })

    const snap = await getDoc(userRef)
    const saved = toUserProfile(uid, snap.data())
    if (!saved) {
      throw new Error('User profile was saved but could not be loaded.')
    }
    return saved
  })
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  return withFirestoreError('Failed to get user profile', async () => {
    const authUid = assertAuthUid(uid, 'uid')
    const database = requireDb()
    const snap = await getDoc(doc(database, COLLECTION, authUid))
    if (!snap.exists()) {
      return null
    }
    return toUserProfile(authUid, snap.data())
  })
}

export type UserProfileUpdateInput = {
  displayName?: string | null
  photoURL?: string | null
}

export async function updateUserProfile(
  uid: string,
  input: UserProfileUpdateInput,
): Promise<UserProfile> {
  return withFirestoreError('Failed to update user profile', async () => {
    const authUid = assertAuthUid(uid, 'uid')
    const database = requireDb()
    const ref = doc(database, COLLECTION, authUid)
    const existing = await getDoc(ref)

    if (!existing.exists()) {
      throw new Error('User profile not found.')
    }

    const payload: FirestoreUpdatePayload = {
      updatedAt: serverTimestamp(),
    }

    if (input.displayName !== undefined) {
      payload.displayName = input.displayName
    }
    if (input.photoURL !== undefined) {
      payload.photoURL = input.photoURL
    }

    await updateDoc(ref, payload)

    const snap = await getDoc(ref)
    const profile = toUserProfile(authUid, snap.data())
    if (!profile) {
      throw new Error('User profile was updated but could not be loaded.')
    }
    return profile
  })
}
