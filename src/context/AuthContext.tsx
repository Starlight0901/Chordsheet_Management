import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../firebase/config'
import { ensureSystemLists } from '../services/listService'
import { upsertUserProfile } from '../services/userService'

interface AuthContextValue {
  currentUser: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const googleProvider = new GoogleAuthProvider()

function getAuthErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
  }

  const code = String((error as { code: string }).code)

  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled.'
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.'
    case 'auth/popup-blocked':
      return 'The sign-in popup was blocked by your browser. Allow popups and try again.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Google sign-in in Firebase.'
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled for this Firebase project.'
    case 'permission-denied':
      return 'Signed in, but Firestore denied saving your profile. Allow writes to users/{uid}.'
    default:
      return error instanceof Error && error.message
        ? error.message
        : 'Unable to sign in with Google. Please try again.'
  }
}

export class AuthActionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthActionError'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const seededListsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setCurrentUser(null)
      setLoading(false)
      return
    }

    let cancelled = false
    let unsubscribe: (() => void) | undefined

    void setPersistence(auth, browserLocalPersistence)
      .catch(() => {
        // IndexedDB/local persistence is still Firebase's default for web apps.
      })
      .finally(() => {
        if (cancelled || !auth) return

        unsubscribe = onAuthStateChanged(auth, (user) => {
          setCurrentUser(user)
          setLoading(false)
        })
      })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    if (!currentUser) return
    if (seededListsRef.current.has(currentUser.uid)) return

    const uid = currentUser.uid
    void ensureSystemLists(uid)
      .then(() => {
        seededListsRef.current.add(uid)
      })
      .catch(() => {
        // Non-blocking — list pages can retry via ensureSystemLists.
      })
  }, [currentUser])

  const signInWithGoogle = useCallback(async () => {
    if (!auth) {
      throw new AuthActionError(
        'Firebase Authentication is not configured. Check your environment variables.',
      )
    }

    try {
      const result = await signInWithPopup(auth, googleProvider)
      await upsertUserProfile(result.user)
      // System lists seed via the currentUser effect (and list pages) — never block sign-in.
      // ensureSystemLists coalesces concurrent callers per uid.
    } catch (error) {
      if (error instanceof AuthActionError) throw error
      throw new AuthActionError(getAuthErrorMessage(error))
    }
  }, [])

  const logout = useCallback(async () => {
    if (!auth) {
      throw new AuthActionError('Firebase Authentication is not configured.')
    }

    try {
      await signOut(auth)
    } catch {
      throw new AuthActionError('Unable to sign out. Please try again.')
    }
  }, [])

  const value = useMemo(
    () => ({
      currentUser,
      loading,
      signInWithGoogle,
      logout,
    }),
    [currentUser, loading, signInWithGoogle, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.')
  }
  return context
}
