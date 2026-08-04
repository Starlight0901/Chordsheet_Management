/**
 * Global hymn taxonomy — single source of truth.
 * Do not redefine languages or categories elsewhere.
 */

export const HYMN_LANGUAGES = ['Sinhala', 'Tamil', 'English'] as const

export type HymnLanguage = (typeof HYMN_LANGUAGES)[number]

/**
 * Fixed global categories. Users cannot create or rename these.
 * Store these exact string values in hymn.categories.
 */
export const HYMN_CATEGORIES = [
  'Praise',
  'Worship',
  'Repentance',
  'Thanksgiving',
  'Prayer',
  'Communion',
  'Surrender',
  'Holy Spirit',
  'Easter',
  'Christmas',
  'Revival',
  'Faith / Trust / Hope',
] as const

export type HymnCategory = (typeof HYMN_CATEGORIES)[number]

export function isHymnLanguage(value: string): value is HymnLanguage {
  return (HYMN_LANGUAGES as readonly string[]).includes(value)
}

export function isHymnCategory(value: string): value is HymnCategory {
  return (HYMN_CATEGORIES as readonly string[]).includes(value)
}

/** Keep only known languages, preserve order from HYMN_LANGUAGES, dedupe. */
export function sanitizeLanguages(values: readonly string[]): HymnLanguage[] {
  const selected = new Set(values.filter(isHymnLanguage))
  return HYMN_LANGUAGES.filter((language) => selected.has(language))
}

/** Keep only known categories, preserve order from HYMN_CATEGORIES, dedupe. */
export function sanitizeCategories(values: readonly string[]): HymnCategory[] {
  const selected = new Set(values.filter(isHymnCategory))
  return HYMN_CATEGORIES.filter((category) => selected.has(category))
}

/** How selected taxonomy values are matched against a hymn. */
export type TaxonomyMatchMode = 'any' | 'all' | 'exact'

export const TAXONOMY_MATCH_MODES: readonly TaxonomyMatchMode[] = ['any', 'all', 'exact']

export const TAXONOMY_MATCH_MODE_LABELS: Record<TaxonomyMatchMode, string> = {
  any: 'Any selected',
  all: 'All selected',
  exact: 'Exact combination',
}

/**
 * Match hymn values against a selected set.
 * - any: hymn contains at least one selected value
 * - all: hymn contains every selected value (extras allowed)
 * - exact: hymn's set equals the selected set
 * Empty selection always passes.
 */
export function matchesTaxonomySelection(
  hymnValues: readonly string[],
  selected: readonly string[],
  mode: TaxonomyMatchMode = 'any',
): boolean {
  if (selected.length === 0) return true

  const hymnSet = new Set(hymnValues)

  if (mode === 'any') {
    return selected.some((value) => hymnSet.has(value))
  }

  if (mode === 'all') {
    return selected.every((value) => hymnSet.has(value))
  }

  // exact
  if (hymnSet.size !== selected.length) return false
  return selected.every((value) => hymnSet.has(value))
}

/** True when no filter is active, or languages match under the given mode. */
export function matchesLanguageFilter(
  hymnLanguages: readonly string[],
  selected: readonly HymnLanguage[],
  mode: TaxonomyMatchMode = 'any',
): boolean {
  return matchesTaxonomySelection(hymnLanguages, selected, mode)
}

/** True when no filter is active, or categories match under the given mode. */
export function matchesCategoryFilter(
  hymnCategories: readonly string[],
  selected: readonly HymnCategory[],
  mode: TaxonomyMatchMode = 'any',
): boolean {
  return matchesTaxonomySelection(hymnCategories, selected, mode)
}

export function toggleSelection<T extends string>(current: readonly T[], value: T): T[] {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
}
