/** Default private lists created for every authenticated user. */
export const SYSTEM_LIST_NAMES = ['I Know', 'Practiced', 'To Practice'] as const

export type SystemListName = (typeof SYSTEM_LIST_NAMES)[number]

export function isSystemListName(name: string): boolean {
  return (SYSTEM_LIST_NAMES as readonly string[]).includes(name)
}
