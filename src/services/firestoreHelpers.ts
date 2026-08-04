import {
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
  type QueryDocumentSnapshot,
  type UpdateData,
} from 'firebase/firestore'
import { auth, db } from '../firebase/config'

export class FirestoreServiceError extends Error {
  readonly cause?: unknown
  readonly code?: string

  constructor(message: string, cause?: unknown, code?: string) {
    super(message)
    this.name = 'FirestoreServiceError'
    this.cause = cause
    this.code = code
  }
}

export type FirestoreUpdatePayload = UpdateData<DocumentData>

export function requireDb(): Firestore {
  if (!db) {
    throw new FirestoreServiceError(
      'Firestore is not configured. Check your Firebase environment variables.',
    )
  }
  return db
}

/** Current Firebase Auth UID, or null if signed out / Auth not ready. */
export function getAuthUid(): string | null {
  return auth?.currentUser?.uid ?? null
}

function extractFirebaseError(error: unknown): { code?: string; message: string } {
  if (typeof error === 'object' && error !== null) {
    const code = 'code' in error ? String((error as { code: unknown }).code) : undefined
    const message =
      error instanceof Error
        ? error.message
        : 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Unknown Firestore error'
    return { code, message }
  }

  return { message: 'Unknown Firestore error' }
}

export interface FirestoreOpLog {
  operation: string
  path: string
  authUid: string | null
}

/** Dev-friendly console logging for Firestore ops (no secrets/passwords). */
export function logFirestoreOp(entry: FirestoreOpLog & { phase: 'start' | 'success' | 'error'; error?: unknown }) {
  if (!import.meta.env.DEV) return

  const base = {
    operation: entry.operation,
    path: entry.path,
    authUid: entry.authUid,
  }

  if (entry.phase === 'start') {
    console.info('[Firestore]', { ...base, phase: 'start' })
    return
  }

  if (entry.phase === 'success') {
    console.info('[Firestore]', { ...base, phase: 'success' })
    return
  }

  const { code, message } = extractFirebaseError(entry.error)
  console.error('[Firestore]', {
    ...base,
    phase: 'error',
    code: code ?? 'unknown',
    message,
  })
}

export async function withFirestoreError<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof FirestoreServiceError) {
      throw error
    }

    const { code, message } = extractFirebaseError(error)
    throw new FirestoreServiceError(
      code ? `${operation}: ${message} (${code})` : `${operation}: ${message}`,
      error,
      code,
    )
  }
}

/** True when Firestore denied the request (including missing-doc gets that rules reject). */
export function isPermissionDenied(error: unknown): boolean {
  if (error instanceof FirestoreServiceError) {
    return error.code === 'permission-denied' || error.code === 'firestore/permission-denied'
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: unknown }).code)
    return code === 'permission-denied' || code === 'firestore/permission-denied'
  }
  return false
}

/**
 * Treat permission-denied the same as a missing document for owner-scoped getDoc lookups.
 * Does not weaken rules — other users' docs still cannot be read; the UI just shows "missing".
 */
export async function nullIfPermissionDenied<T>(fn: () => Promise<T | null>): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    if (isPermissionDenied(error)) return null
    throw error
  }
}

/**
 * Run a Firestore write/read with structured logging.
 * Use for create/update paths that need clear permission-denied diagnostics.
 */
export async function withLoggedFirestoreOp<T>(
  meta: FirestoreOpLog,
  fn: () => Promise<T>,
): Promise<T> {
  logFirestoreOp({ ...meta, phase: 'start' })
  try {
    const result = await withFirestoreError(meta.operation, fn)
    logFirestoreOp({ ...meta, phase: 'success' })
    return result
  } catch (error) {
    logFirestoreOp({ ...meta, phase: 'error', error: error instanceof FirestoreServiceError ? error.cause ?? error : error })
    throw error
  }
}

/** Builds deterministic document ids such as favorites/{userId_hymnId}. */
export function compositeId(...parts: string[]): string {
  if (parts.some((part) => !part.trim())) {
    throw new FirestoreServiceError('Composite document id parts must be non-empty.')
  }
  return parts.join('_')
}

export function mapDoc<T extends { id: string }>(
  snap: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>,
): T | null {
  if (!snap.exists()) {
    return null
  }

  return {
    id: snap.id,
    ...snap.data(),
  } as T
}

export function mapDocs<T extends { id: string }>(
  docs: Array<QueryDocumentSnapshot<DocumentData>>,
): T[] {
  return docs.map((snap) => mapDoc<T>(snap)!)
}

export function assertAuthUid(expectedUid: string, fieldName: string): string {
  const trimmed = expectedUid.trim()
  if (!trimmed) {
    throw new FirestoreServiceError(`${fieldName} is required and must be the authenticated user's UID.`)
  }

  const authUid = getAuthUid()
  if (!authUid) {
    throw new FirestoreServiceError(
      `Cannot write ${fieldName}: no authenticated Firebase user. Sign in and try again.`,
      undefined,
      'unauthenticated',
    )
  }

  if (authUid !== trimmed) {
    throw new FirestoreServiceError(
      `${fieldName} ("${trimmed}") does not match the authenticated UID ("${authUid}").`,
      undefined,
      'permission-denied',
    )
  }

  return authUid
}
