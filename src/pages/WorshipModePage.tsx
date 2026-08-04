import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { WorshipMode, type WorshipModeSlide } from '../components/worship/WorshipMode'
import { useAuth } from '../context/AuthContext'
import { getChordSheet } from '../services/chordSheetService'
import { getHymn } from '../services/hymnService'
import { getWorshipPlan, listWorshipPlanItems } from '../services/worshipService'

type LoadState = 'loading' | 'ready' | 'error' | 'missing' | 'forbidden' | 'empty'

export function WorshipModePage() {
  const { planId } = useParams<{ planId: string }>()
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [planName, setPlanName] = useState('')
  const [slides, setSlides] = useState<WorshipModeSlide[]>([])

  useEffect(() => {
    if (!planId || !currentUser) {
      setLoadState(!currentUser ? 'forbidden' : 'missing')
      return
    }

    let cancelled = false

    async function load() {
      setLoadState('loading')
      setErrorMessage(null)

      try {
        const userId = currentUser!.uid
        const [planDoc, items] = await Promise.all([
          getWorshipPlan(planId!),
          listWorshipPlanItems(planId!, userId),
        ])

        if (cancelled) return

        if (!planDoc) {
          setLoadState('missing')
          return
        }

        if (planDoc.userId !== userId) {
          setLoadState('forbidden')
          return
        }

        // Follow saved order exactly (already ordered by `order` in the service).
        const ordered = [...items].sort((a, b) => a.order - b.order)

        if (ordered.length === 0) {
          setPlanName(planDoc.name)
          setSlides([])
          setLoadState('empty')
          return
        }

        const nextSlides: WorshipModeSlide[] = await Promise.all(
          ordered.map(async (item) => {
            if (item.type === 'note') {
              return { item }
            }

            const hymn = item.hymnId ? await getHymn(item.hymnId) : null
            const chordSheet = item.chordSheetId
              ? await getChordSheet(item.chordSheetId)
              : null

            return { item, hymn, chordSheet }
          }),
        )

        if (cancelled) return

        setPlanName(planDoc.name)
        setSlides(nextSlides)
        setLoadState('ready')
      } catch (error) {
        if (cancelled) return
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load worship mode.')
        setLoadState('error')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [planId, currentUser])

  function exitToEditor() {
    if (planId) {
      navigate(`/worship/${planId}`, { replace: true })
      return
    }
    navigate('/worship', { replace: true })
  }

  if (loadState === 'loading') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-ink-950 px-6">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-ink-600 border-t-gold-400" />
        <p className="text-sm text-ink-400">Starting Worship Mode…</p>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-ink-950 px-6 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-ember-500" strokeWidth={1.5} />
        <p className="text-sm font-medium text-ink-100">Couldn’t start Worship Mode</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-400">{errorMessage}</p>
        <button
          type="button"
          onClick={exitToEditor}
          className="mt-6 rounded-xl border border-ink-600 px-4 py-2.5 text-sm text-ink-200 hover:border-gold-500/40 hover:text-gold-400"
        >
          Back to plan
        </button>
      </div>
    )
  }

  if (loadState === 'missing' || loadState === 'forbidden') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-ink-950 px-6 text-center">
        <p className="text-sm font-medium text-ink-200">
          {loadState === 'forbidden'
            ? 'You don’t have access to this worship plan.'
            : 'Worship plan not found'}
        </p>
        <Link
          to="/worship"
          className="mt-6 text-sm text-gold-400 hover:text-gold-400/80"
        >
          Back to Worship plans
        </Link>
      </div>
    )
  }

  if (loadState === 'empty') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-ink-950 px-6 text-center">
        <p className="text-sm font-medium text-ink-100">{planName}</p>
        <p className="mt-2 max-w-sm text-sm text-ink-400">
          This plan is empty. Add hymns or notes before starting Worship Mode.
        </p>
        <button
          type="button"
          onClick={exitToEditor}
          className="mt-6 rounded-xl border border-ink-600 px-4 py-2.5 text-sm text-ink-200 hover:border-gold-500/40 hover:text-gold-400"
        >
          Back to plan
        </button>
      </div>
    )
  }

  return <WorshipMode planName={planName} slides={slides} onExit={exitToEditor} />
}
