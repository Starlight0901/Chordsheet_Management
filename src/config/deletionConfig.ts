/**
 * Client-side deletion password configuration.
 *
 * ============================================================================
 * IMPORTANT — THIS IS NOT A TRUE SECURITY BOUNDARY
 * ============================================================================
 *
 * Anyone who can open DevTools or read the built JavaScript bundle can
 * discover this value and bypass the confirmation dialog.
 *
 * That is acceptable for HymnBook's intended use: ~10–20 trusted users
 * where this password is only an accidental-deletion convenience barrier.
 *
 * Real database access control remains Firestore security rules
 * (authenticated users only; personal data stays owner-scoped).
 *
 * Do NOT put privileged secrets here (Cloudinary API secret, etc.).
 * Do NOT treat this as cryptographic protection.
 *
 * Change DELETION_PASSWORD before sharing the app with your group.
 */

/** App deletion password (not the user's Google password). */
export const DELETION_PASSWORD = 'hymnbook-delete'

/**
 * Local confirmation check only. Not cryptographically secure.
 */
export function verifyDeletionPassword(input: string): boolean {
  return input.trim() === DELETION_PASSWORD
}
