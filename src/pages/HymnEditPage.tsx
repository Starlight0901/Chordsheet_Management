import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { HymnForm } from '../components/hymns/HymnForm'
import { useAuth } from '../context/AuthContext'
import { listChordSheetsByHymn } from '../services/chordSheetService'
import { isCloudinaryConfigured } from '../services/cloudinaryService'
import { getHymn } from '../services/hymnService'
import type { ChordSheet, Hymn } from '../types'

type LoadState = 'loading' | 'ready' | 'error' | 'missing'

export function HymnEditPage() {
  const { hymnId } = useParams<{ hymnId: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [hymn, setHymn] = useState<Hymn | null>(null)
  const [chordSheets, setChordSheets] = useState<ChordSheet[]>([])

  useEffect(() => {
    if (!hymnId) {
      setLoadState('missing')
      return
    }

    let cancelled = false

    async function load() {
      setLoadState('loading')
      setErrorMessage(null)

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

  if (!currentUser) {
    return null
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 sm:mb-8">
        <Link
          to={hymnId ? `/hymns/${hymnId}` : '/hymns'}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-400 transition hover:text-gold-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <p className="mb-2 text-sm font-medium tracking-[0.18em] text-gold-500 uppercase">
          Shared library
        </p>
        <h2 className="font-display text-3xl font-semibold text-ink-100 sm:text-4xl">Edit hymn</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-300 sm:text-base">
          Update hymn details, add or reorder chord sheets, or request sheet deletion.
        </p>
      </div>

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
          {!isCloudinaryConfigured() && (
            <div className="mb-5 rounded-xl border border-ember-500/40 bg-ember-500/10 px-4 py-3 text-sm text-ember-500">
              Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and
              VITE_CLOUDINARY_UPLOAD_PRESET before uploading images.
            </div>
          )}

          <div className="rounded-2xl border border-ink-700/70 bg-ink-800/40 p-4 sm:p-6">
            <HymnForm
              mode="edit"
              userId={currentUser.uid}
              hymn={hymn}
              initialChordSheets={chordSheets}
              onCancel={() => navigate(`/hymns/${hymn.id}`)}
              onSuccess={({ hymn: saved }) => navigate(`/hymns/${saved.id}`, { replace: true })}
            />
          </div>
        </>
      )}
    </div>
  )
}
