/** Safe in-app path only (rejects protocol-relative //evil.example). */
export function safeReturnPath(from: unknown, fallback = '/'): string {
  if (typeof from !== 'string') return fallback
  if (!/^\/(?!\/)/.test(from)) return fallback
  if (from.startsWith('/login')) return fallback
  return from
}
