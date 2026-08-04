import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CalendarPlus,
  ListPlus,
  Pencil,
  Trash2,
} from 'lucide-react'
import { AddToListDialog } from '../components/hymns/AddToListDialog'
import { AddToWorshipPlanDialog } from '../components/hymns/AddToWorshipPlanDialog'
import { ChordSheetNotesEditor } from '../components/hymns/ChordSheetNotesEditor'
import { ChordSheetViewer } from '../components/hymns/ChordSheetViewer'
import { DeletionPasswordDialog } from '../components/hymns/DeletionPasswordDialog'
import { FavoriteButton } from '../components/hymns/FavoriteButton'
import { UserTagSelector } from '../components/hymns/UserTagSelector'
import { TaxonomyBadges } from '../components/taxonomy'
import { useAuth } from '../context/AuthContext'
import { listChordSheetsByHymn } from '../services/chordSheetService'
import { deleteHymnWithPassword, DeletionServiceError } from '../services/deletionService'
import { addFavorite, isFavorite, removeFavorite } from '../services/favoriteService'
import { getHymn } from '../services/hymnService'
import type { ChordSheet, Hymn } from '../types'

type LoadState = 'loading' | 'ready' | 'error' | 'missing'
type FavoriteLoadState = 'idle' | 'loading' | 'ready' | 'error'

export function HymnDetailsPage() {
  const { hymnId } = useParams<{ hymnId: string }>()
  const navigate = useNavigate()
  const { currentUser, loading: authLoading } = useAuth()

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [hymn, setHymn] = useState<Hymn | null>(null)
  const [chordSheets, setChordSheets] = useState<ChordSheet[]>([])
  const [sheetIndex, setSheetIndex] = useState(0)

  const [favorited, setFavorited] = useState(false)
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const [favoriteLoadState, setFavoriteLoadState] = useState<FavoriteLoadState>('idle')
  const [favoriteError, setFavoriteError] = useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [listOpen, setListOpen] = useState(false)
  const [worshipOpen, setWorshipOpen] = useState(false)

  // Primary hymn + chord sheet load — independent of favorites.
  useEffect(() => {
    if (!hymnId) {
      setLoadState('missing')
      return
    }

    let cancelled = false

    async function load() {
      setLoadState('loading')
      setErrorMessage(null)
      setSheetIndex(0)

      try {
        const [hymnDoc, sheets] = await Promise.all([
          getHymn(hymnId!),
          listChordSheetsByHymn(hymnId!),
        ])

        if (cancelled) return

        if (!hymnDoc) {
          setLoadState('missing')
          return
        }

        setHymn(hymnDoc)
        setChordSheets(sheets)
        setLoadState('ready')
      } catch (error) {
        if (cancelled) return
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load hymn.')
        setLoadState('error')
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [hymnId])

  // Favorite check waits for auth and never blocks hymn rendering.
  useEffect(() => {
    if (!hymnId || authLoading) return

    if (!currentUser) {
      setFavorited(false)
      setFavoriteLoadState('idle')
      setFavoriteError(null)
      return
    }

    let cancelled = false

    async function loadFavorite() {
      setFavoriteLoadState('loading')
      setFavoriteError(null)
      try {
        const favorite = await isFavorite(currentUser!.uid, hymnId!)
        if (cancelled) return
        setFavorited(favorite)
        setFavoriteLoadState('ready')
      } catch (error) {
        if (cancelled) return
        setFavorited(false)
        setFavoriteLoadState('error')
        setFavoriteError(
          error instanceof Error ? error.message : 'Could not check favorite status.',
        )
      }
    }

    void loadFavorite()

    return () => {
      cancelled = true
    }
  }, [hymnId, currentUser, authLoading])

  async function handleToggleFavorite(next: boolean) {
    if (!currentUser || !hymn || favoriteLoadState === 'loading') return
    setFavoriteBusy(true)
    setFavoriteError(null)
    setFavorited(next)
    try {
      if (next) await addFavorite(currentUser.uid, hymn.id)
      else await removeFavorite(currentUser.uid, hymn.id)
      setFavoriteLoadState('ready')
    } catch (error) {
      setFavorited(!next)
      setFavoriteError(
        error instanceof Error ? error.message : 'Could not update favorite.',
      )
      setFavoriteLoadState('error')
    } finally {
      setFavoriteBusy(false)
    }
  }

  async function handleDeleteHymn(deletionPassword: string) {
    if (!hymn) return

    setDeleteBusy(true)
    setDeleteError(null)

    try {
      await deleteHymnWithPassword({
        hymnId: hymn.id,
        deletionPassword,
      })
      navigate('/hymns', { replace: true })
    } catch (error) {
      setDeleteError(
        error instanceof DeletionServiceError || error instanceof Error
          ? error.message
          : 'Failed to delete hymn.',
      )
      setDeleteBusy(false)
    }
  }

  const activeSheet = chordSheets[sheetIndex]
  const favoriteDisabled =
    !currentUser || favoriteBusy || favoriteLoadState === 'loading' || authLoading

  return (
    <div className="mx-auto w-full max-w-5xl">
      {loadState !== 'ready' && (
        <Link
          to="/hymns"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-400 transition hover:text-gold-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to library
        </Link>
      )}

      {loadState === 'loading' && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-ink-700/70 bg-ink-800/30 px-6 py-20">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-ink-600 border-t-gold-400" />
          <p className="text-sm text-ink-400">Loading hymn…</p>
        </div>
      )}

      {loadState === 'error' && (
        <div className="rounded-2xl border border-ember-500/40 bg-ember-500/10 px-6 py-12 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-ember-500" strokeWidth={1.5} />
          <p className="text-sm font-medium text-ink-100">Couldn’t load this hymn</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-400">{errorMessage}</p>
        </div>
      )}

      {loadState === 'missing' && (
        <div className="rounded-2xl border border-dashed border-ink-600 bg-ink-800/30 px-6 py-16 text-center">
          <p className="text-sm font-medium text-ink-200">Hymn not found</p>
          <Link to="/hymns" className="mt-4 inline-block text-sm text-gold-400 hover:text-gold-400/80">
            Back to library
          </Link>
        </div>
      )}

      {loadState === 'ready' && hymn && (
        <>
          <div className="mb-4 space-y-3">
            <Link
              to="/hymns"
              className="inline-flex min-h-10 items-center gap-1.5 text-sm text-ink-400 transition hover:text-gold-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <FavoriteButton
                isFavorite={favorited}
                busy={favoriteBusy || favoriteLoadState === 'loading'}
                disabled={favoriteDisabled}
                onToggle={(next) => void handleToggleFavorite(next)}
                size="sm"
                showLabel
                label="Favorite"
                className="shrink-0"
              />
              <button
                type="button"
                disabled={!currentUser}
                onClick={() => setListOpen(true)}
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-ink-600 bg-ink-800/60 px-3 text-xs font-medium text-ink-300 transition hover:border-gold-500/40 hover:text-gold-400 disabled:opacity-50 sm:text-sm"
              >
                <ListPlus className="h-4 w-4" strokeWidth={2} />
                List
              </button>
              <button
                type="button"
                disabled={!currentUser}
                onClick={() => setWorshipOpen(true)}
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-ink-600 bg-ink-800/60 px-3 text-xs font-medium text-ink-300 transition hover:border-gold-500/40 hover:text-gold-400 disabled:opacity-50 sm:text-sm"
              >
                <CalendarPlus className="h-4 w-4" strokeWidth={2} />
                Worship
              </button>
              <Link
                to={`/hymns/${hymn.id}/edit`}
                aria-label="Edit hymn"
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-ink-600 bg-ink-800/60 px-3 text-xs font-medium text-ink-300 transition hover:border-gold-500/40 hover:text-gold-400 sm:text-sm"
              >
                <Pencil className="h-4 w-4" strokeWidth={2} />
                Edit
              </Link>
              <button
                type="button"
                aria-label="Delete hymn"
                onClick={() => {
                  setDeleteError(null)
                  setDeleteOpen(true)
                }}
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-ember-500/35 bg-ember-500/10 px-3 text-xs font-medium text-ember-500 transition hover:bg-ember-500/20 sm:text-sm"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
                Delete
              </button>
            </div>
          </div>

          {favoriteError && (
            <p className="mb-3 rounded-xl border border-ember-500/35 bg-ember-500/10 px-3 py-2 text-xs text-ember-500">
              {favoriteError}
            </p>
          )}

          <header className="mb-5 sm:mb-6">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-semibold text-ink-100 sm:text-4xl">
                {hymn.name}
              </h1>
              <TaxonomyBadges
                languages={hymn.languages}
                categories={hymn.categories}
                className="mt-3"
              />
            </div>

            {currentUser && (
              <UserTagSelector
                userId={currentUser.uid}
                hymnId={hymn.id}
                className="mt-5 rounded-2xl border border-ink-700/70 bg-ink-800/40 p-4"
              />
            )}
          </header>

          {chordSheets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-600 bg-ink-800/30 px-6 py-16 text-center">
              <p className="text-sm text-ink-400">No chord sheets yet.</p>
              <Link
                to={`/hymns/${hymn.id}/edit`}
                className="mt-3 inline-block text-sm text-gold-400 hover:text-gold-400/80"
              >
                Add chord sheets
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              <ChordSheetViewer
                sheets={chordSheets}
                index={sheetIndex}
                onIndexChange={setSheetIndex}
              />

              {currentUser && activeSheet && (
                <ChordSheetNotesEditor
                  key={activeSheet.id}
                  userId={currentUser.uid}
                  chordSheetId={activeSheet.id}
                />
              )}
            </div>
          )}

          <DeletionPasswordDialog
            open={deleteOpen}
            title="Delete hymn"
            description={`Permanently delete “${hymn.name}” and its chord-sheet metadata from Firestore. Cloudinary images are not deleted automatically. This confirmation password is only an accidental-deletion barrier.`}
            confirmLabel="Delete hymn"
            busy={deleteBusy}
            error={deleteError}
            onCancel={() => {
              if (deleteBusy) return
              setDeleteOpen(false)
              setDeleteError(null)
            }}
            onConfirm={(password) => void handleDeleteHymn(password)}
          />

          {currentUser && (
            <>
              <AddToListDialog
                open={listOpen}
                userId={currentUser.uid}
                hymnId={hymn.id}
                hymnName={hymn.name}
                onClose={() => setListOpen(false)}
              />
              <AddToWorshipPlanDialog
                open={worshipOpen}
                userId={currentUser.uid}
                hymnId={hymn.id}
                chordSheetId={activeSheet?.id}
                hymnName={hymn.name}
                onClose={() => setWorshipOpen(false)}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
