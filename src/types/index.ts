import type { Timestamp } from 'firebase/firestore'
import type { HymnCategory, HymnLanguage, TaxonomyMatchMode } from '../constants/taxonomy'

/** users/{uid} */
export interface UserProfile {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
  createdAt?: Timestamp | null
  updatedAt?: Timestamp | null
}

/** hymns/{hymnId} — shared */
export interface Hymn {
  id: string
  name: string
  /** Values from HYMN_LANGUAGES only */
  languages: HymnLanguage[]
  /** Values from HYMN_CATEGORIES only */
  categories: HymnCategory[]
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type HymnCreateInput = {
  name: string
  languages?: HymnLanguage[]
  categories?: HymnCategory[]
  createdBy: string
}

export type HymnUpdateInput = {
  name?: string
  languages?: HymnLanguage[]
  categories?: HymnCategory[]
}

/**
 * chordSheets/{sheetId} — shared metadata only.
 * Image binaries live in Cloudinary; Firestore stores URL + public id.
 */
export interface ChordSheet {
  id: string
  hymnId: string
  imageUrl: string
  cloudinaryPublicId: string
  originalFileName: string
  order: number
  uploadedBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type ChordSheetCreateInput = {
  hymnId: string
  imageUrl: string
  cloudinaryPublicId: string
  originalFileName: string
  order: number
  uploadedBy: string
}

export type ChordSheetUpdateInput = {
  imageUrl?: string
  cloudinaryPublicId?: string
  originalFileName?: string
  order?: number
}

/** chordSheetNotes/{noteId} — one note per user per chord sheet */
export interface ChordSheetNote {
  id: string
  chordSheetId: string
  userId: string
  content: string
  updatedAt: Timestamp
}

/** favorites/{userId_hymnId} */
export interface Favorite {
  id: string
  userId: string
  hymnId: string
  createdAt: Timestamp
}

/** userTags/{tagId} */
export interface UserTag {
  id: string
  userId: string
  name: string
  createdAt: Timestamp
}

export type UserTagCreateInput = {
  userId: string
  name: string
}

/** userHymnTags/{userId_hymnId_tagId} */
export interface UserHymnTag {
  id: string
  userId: string
  hymnId: string
  tagId: string
}

export type UserListType = 'manual' | 'smart' | 'system'

/**
 * Saved filter definition for Smart Lists.
 * Never includes hymn IDs — results are evaluated live against current hymns.
 */
export interface SmartListFilter {
  languages: HymnLanguage[]
  languageMode: TaxonomyMatchMode
  categories: HymnCategory[]
  categoryMode: TaxonomyMatchMode
  /** Optional private user tag ids (AND). */
  userTagIds: string[]
}

/** userLists/{listId} */
export interface UserList {
  id: string
  userId: string
  name: string
  description?: string
  type: UserListType
  /** Only for type === 'smart'. Filter definition only — no hymn IDs. */
  filter?: SmartListFilter
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type UserListCreateInput = {
  userId: string
  name: string
  description?: string
  type?: UserListType
  filter?: SmartListFilter
}

export type UserListUpdateInput = {
  name?: string
  description?: string | null
  type?: UserListType
  filter?: SmartListFilter | null
}

/** userListItems/{itemId} */
export interface UserListItem {
  id: string
  listId: string
  userId: string
  hymnId: string
  order: number
  createdAt: Timestamp
}

export type UserListItemCreateInput = {
  listId: string
  userId: string
  hymnId: string
  order: number
}

/** worshipPlans/{planId} */
export interface WorshipPlan {
  id: string
  userId: string
  name: string
  description?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type WorshipPlanCreateInput = {
  userId: string
  name: string
  description?: string
}

export type WorshipPlanUpdateInput = {
  name?: string
  description?: string | null
}

export type WorshipPlanItemType = 'hymn' | 'note'

/** worshipPlanItems/{itemId} */
export interface WorshipPlanItem {
  id: string
  planId: string
  userId: string
  type: WorshipPlanItemType
  hymnId?: string
  chordSheetId?: string
  content?: string
  order: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type WorshipPlanItemCreateInput = {
  planId: string
  userId: string
  type: WorshipPlanItemType
  hymnId?: string
  chordSheetId?: string
  content?: string
  order: number
}

export type WorshipPlanItemUpdateInput = {
  type?: WorshipPlanItemType
  hymnId?: string | null
  chordSheetId?: string | null
  content?: string | null
  order?: number
}
