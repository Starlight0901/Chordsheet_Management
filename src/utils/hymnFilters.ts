import type { Hymn, SmartListFilter, UserTag } from '../types'
import {
  matchesCategoryFilter,
  matchesLanguageFilter,
  sanitizeCategories,
  sanitizeLanguages,
  type HymnCategory,
  type HymnLanguage,
  type TaxonomyMatchMode,
} from '../constants/taxonomy'

export type { TaxonomyMatchMode }

/** Shared interactive filter state (library, personal lists, worship picker). */
export interface HymnFilterState {
  query: string
  languages: HymnLanguage[]
  languageMode: TaxonomyMatchMode
  categories: HymnCategory[]
  categoryMode: TaxonomyMatchMode
  userTagIds: string[]
}

export const EMPTY_HYMN_FILTER: HymnFilterState = {
  query: '',
  languages: [],
  languageMode: 'any',
  categories: [],
  categoryMode: 'any',
  userTagIds: [],
}

export const EMPTY_SMART_LIST_FILTER: SmartListFilter = {
  languages: [],
  languageMode: 'any',
  categories: [],
  categoryMode: 'any',
  userTagIds: [],
}

export interface HymnFilterOptions {
  query?: string
  languages?: readonly HymnLanguage[]
  languageMode?: TaxonomyMatchMode
  categories?: readonly HymnCategory[]
  categoryMode?: TaxonomyMatchMode
  /**
   * Private user tag ids. Empty = no tag filter.
   * When set, hymn must have every selected tag (AND).
   */
  userTagIds?: readonly string[]
  /** hymnId → set of the current user's tag ids on that hymn */
  hymnTagMap?: ReadonlyMap<string, ReadonlySet<string>>
}

export function createEmptyHymnFilter(): HymnFilterState {
  return { ...EMPTY_HYMN_FILTER, languages: [], categories: [], userTagIds: [] }
}

export function createEmptySmartListFilter(): SmartListFilter {
  return {
    ...EMPTY_SMART_LIST_FILTER,
    languages: [],
    categories: [],
    userTagIds: [],
  }
}

/** Normalize a saved or drafted smart-list filter (no hymn IDs). */
export function sanitizeSmartListFilter(input: Partial<SmartListFilter> | null | undefined): SmartListFilter {
  const languageMode: TaxonomyMatchMode =
    input?.languageMode === 'all' || input?.languageMode === 'exact' ? input.languageMode : 'any'
  const categoryMode: TaxonomyMatchMode =
    input?.categoryMode === 'all' || input?.categoryMode === 'exact' ? input.categoryMode : 'any'

  return {
    languages: sanitizeLanguages(input?.languages ?? []),
    languageMode,
    categories: sanitizeCategories(input?.categories ?? []),
    categoryMode,
    userTagIds: [...new Set((input?.userTagIds ?? []).filter((id) => typeof id === 'string' && id.trim()))],
  }
}

export function smartListFilterToState(filter: SmartListFilter): HymnFilterState {
  const clean = sanitizeSmartListFilter(filter)
  return {
    query: '',
    languages: clean.languages,
    languageMode: clean.languageMode,
    categories: clean.categories,
    categoryMode: clean.categoryMode,
    userTagIds: clean.userTagIds,
  }
}

export function hymnFilterStateToSmartListFilter(state: HymnFilterState): SmartListFilter {
  return sanitizeSmartListFilter({
    languages: state.languages,
    languageMode: state.languageMode,
    categories: state.categories,
    categoryMode: state.categoryMode,
    userTagIds: state.userTagIds,
  })
}

export function hasActiveHymnFilters(state: Pick<HymnFilterState, 'query' | 'languages' | 'categories' | 'userTagIds'>): boolean {
  return (
    state.query.trim().length > 0 ||
    state.languages.length > 0 ||
    state.categories.length > 0 ||
    state.userTagIds.length > 0
  )
}

export function hasActiveSmartListFilter(filter: SmartListFilter): boolean {
  return (
    filter.languages.length > 0 ||
    filter.categories.length > 0 ||
    filter.userTagIds.length > 0
  )
}

export function toHymnFilterOptions(
  state: HymnFilterState | SmartListFilter,
  hymnTagMap?: ReadonlyMap<string, ReadonlySet<string>>,
): HymnFilterOptions {
  const query = 'query' in state ? state.query : ''
  return {
    query,
    languages: state.languages,
    languageMode: state.languageMode,
    categories: state.categories,
    categoryMode: state.categoryMode,
    userTagIds: state.userTagIds,
    hymnTagMap,
  }
}

/** Build hymnId → tagId set map from userHymnTags links. */
export function buildHymnTagMap(
  links: readonly { hymnId: string; tagId: string }[],
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const link of links) {
    let set = map.get(link.hymnId)
    if (!set) {
      set = new Set()
      map.set(link.hymnId, set)
    }
    set.add(link.tagId)
  }
  return map
}

/** Human-readable summary of a smart list / filter definition. */
export function describeSmartListFilter(
  filter: SmartListFilter,
  tagsById?: ReadonlyMap<string, UserTag> | readonly UserTag[],
): string {
  const clean = sanitizeSmartListFilter(filter)
  const parts: string[] = []

  if (clean.languages.length > 0) {
    const mode =
      clean.languageMode === 'all' ? 'all of' : clean.languageMode === 'exact' ? 'exactly' : 'any of'
    parts.push(`Languages (${mode}): ${clean.languages.join(', ')}`)
  }

  if (clean.categories.length > 0) {
    const mode =
      clean.categoryMode === 'all' ? 'all of' : clean.categoryMode === 'exact' ? 'exactly' : 'any of'
    parts.push(`Categories (${mode}): ${clean.categories.join(', ')}`)
  }

  if (clean.userTagIds.length > 0) {
    const tagMap = toTagLookup(tagsById)
    const names = clean.userTagIds.map((id) => tagMap.get(id)?.name ?? 'Tag')
    parts.push(`Your tags (all): ${names.join(', ')}`)
  }

  return parts.length > 0 ? parts.join(' · ') : 'No filters (all hymns)'
}

function toTagLookup(
  tagsById?: ReadonlyMap<string, UserTag> | readonly UserTag[],
): Map<string, UserTag> {
  const map = new Map<string, UserTag>()
  if (!tagsById) return map
  if ('get' in tagsById && typeof tagsById.get === 'function' && 'size' in tagsById) {
    for (const [id, tag] of tagsById as ReadonlyMap<string, UserTag>) {
      map.set(id, tag)
    }
    return map
  }
  for (const tag of tagsById as readonly UserTag[]) {
    map.set(tag.id, tag)
  }
  return map
}

/** Case-insensitive substring match on hymn name. Empty query matches all. */
export function matchesHymnName(name: string, query: string): boolean {
  const trimmed = query.trim()
  if (!trimmed) return true
  return name.toLowerCase().includes(trimmed.toLowerCase())
}

/** Apply language/category filters for lists, search, and smart lists. */
export function filterHymnsByTaxonomy(
  hymns: readonly Hymn[],
  languages: readonly HymnLanguage[],
  categories: readonly HymnCategory[],
  languageMode: TaxonomyMatchMode = 'any',
  categoryMode: TaxonomyMatchMode = 'any',
): Hymn[] {
  return hymns.filter(
    (hymn) =>
      matchesLanguageFilter(hymn.languages, languages, languageMode) &&
      matchesCategoryFilter(hymn.categories, categories, categoryMode),
  )
}

/**
 * Single filtering path used by Hymn Library, Smart Lists, Personal Lists,
 * and Worship hymn picker.
 */
export function filterHymns(hymns: readonly Hymn[], options: HymnFilterOptions = {}): Hymn[] {
  const {
    query = '',
    languages = [],
    languageMode = 'any',
    categories = [],
    categoryMode = 'any',
    userTagIds = [],
    hymnTagMap,
  } = options

  return hymns.filter((hymn) => {
    if (!matchesHymnName(hymn.name, query)) return false
    if (!matchesLanguageFilter(hymn.languages, languages, languageMode)) return false
    if (!matchesCategoryFilter(hymn.categories, categories, categoryMode)) return false

    if (userTagIds.length > 0) {
      const tagsOnHymn = hymnTagMap?.get(hymn.id)
      if (!tagsOnHymn) return false
      if (!userTagIds.every((tagId) => tagsOnHymn.has(tagId))) return false
    }

    return true
  })
}

/** Evaluate a smart list against the current hymn library (live, no stored IDs). */
export function evaluateSmartList(
  hymns: readonly Hymn[],
  filter: SmartListFilter,
  hymnTagMap?: ReadonlyMap<string, ReadonlySet<string>>,
): Hymn[] {
  return filterHymns(hymns, toHymnFilterOptions(sanitizeSmartListFilter(filter), hymnTagMap))
}
