import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { ChordSheet, Hymn, WorshipPlanItem } from '../../types'
import { cn } from '../../utils/cn'

export interface WorshipModeSlide {
  item: WorshipPlanItem
  hymn?: Hymn | null
  chordSheet?: ChordSheet | null
}

interface WorshipModeProps {
  planName: string
  slides: WorshipModeSlide[]
  onExit: () => void
}

const ZOOM_MIN = 1
const ZOOM_MAX = 3
const ZOOM_STEP = 0.25

function formatPosition(index: number, total: number): string {
  const width = Math.max(2, String(total).length)
  return `${String(index + 1).padStart(width, '0')} / ${String(total).padStart(width, '0')}`
}

/**
 * Distraction-free presentation: one plan item at a time, read-only.
 * Does not modify the worship plan.
 */
export function WorshipMode({ planName, slides, onExit }: WorshipModeProps) {
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const total = slides.length
  const slide = slides[index]
  const isNote = slide?.item.type === 'note'
  const canPrev = index > 0
  const canNext = index < total - 1

  useEffect(() => {
    setZoom(1)
    setImageFailed(false)
  }, [index, slide?.item.id])

  useEffect(() => {
    function onFullscreenChange() {
      setFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const goPrev = useCallback(() => {
    setIndex((current) => Math.max(0, current - 1))
  }, [])

  const goNext = useCallback(() => {
    setIndex((current) => Math.min(total - 1, current + 1))
  }, [total])

  const toggleFullscreen = useCallback(async () => {
    const el = rootRef.current
    if (!el) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await el.requestFullscreen()
      }
    } catch {
      // Fullscreen may be blocked.
    }
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        if (document.fullscreenElement) {
          void document.exitFullscreen().catch(() => onExit())
          return
        }
        onExit()
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrev()
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goPrev, goNext, onExit])

  function zoomIn() {
    setZoom((current) => Math.min(ZOOM_MAX, Math.round((current + ZOOM_STEP) * 100) / 100))
  }

  function zoomOut() {
    setZoom((current) => Math.max(ZOOM_MIN, Math.round((current - ZOOM_STEP) * 100) / 100))
  }

  if (!slide || total === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-ink-950 px-6 text-center">
        <p className="text-sm text-ink-400">This worship plan has no items.</p>
        <button
          type="button"
          onClick={onExit}
          className="mt-4 rounded-xl border border-ink-600 px-4 py-2.5 text-sm text-ink-200 hover:border-gold-500/40 hover:text-gold-400"
        >
          Exit Worship Mode
        </button>
      </div>
    )
  }

  const position = formatPosition(index, total)
  const hymnName = slide.hymn?.name ?? 'Unknown hymn'
  const sheet = slide.chordSheet

  return (
    <div
      ref={rootRef}
      className="flex min-h-dvh flex-col bg-ink-950 text-ink-100"
      role="application"
      aria-label={`Worship Mode: ${planName}`}
    >
      <header className="safe-area-pt flex shrink-0 items-center justify-between gap-3 border-b border-ink-800/80 px-3 py-2.5 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium tracking-[0.2em] text-ink-500 uppercase">
            {planName}
          </p>
          <p className="mt-0.5 font-mono text-sm tabular-nums tracking-wide text-gold-400 sm:text-base">
            {position}
          </p>
        </div>
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit Worship Mode"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink-600 px-3 text-sm text-ink-300 transition hover:border-ember-500/40 hover:text-ember-500"
        >
          <X className="h-4 w-4" />
          <span className="hidden sm:inline">Exit</span>
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        {isNote ? (
          <div className="flex flex-1 flex-col items-center justify-center brand-surface-muted px-5 py-10 sm:px-10">
            <p className="mb-4 text-xs font-medium tracking-[0.25em] text-gold-500 uppercase">
              Note
            </p>
            <p className="max-w-3xl whitespace-pre-wrap text-center font-display text-3xl leading-snug font-semibold text-ink-100 sm:text-4xl md:text-5xl">
              {slide.item.content?.trim() || 'Empty note'}
            </p>
          </div>
        ) : (
          <>
            <div className="shrink-0 px-4 pt-3 pb-2 text-center sm:px-6 sm:pt-5">
              <p className="mb-1 text-[10px] font-medium tracking-[0.2em] text-ink-500 uppercase">
                Hymn
              </p>
              <h1 className="font-display text-xl font-semibold text-ink-100 sm:text-3xl md:text-4xl">
                {hymnName}
              </h1>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 px-3 pb-2">
              <button
                type="button"
                aria-label="Zoom out"
                disabled={zoom <= ZOOM_MIN || !sheet}
                onClick={zoomOut}
                className="touch-target rounded-xl border border-ink-600 text-ink-300 transition hover:border-gold-500/40 hover:text-gold-400 disabled:opacity-40"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="min-w-[3.25rem] text-center text-xs tabular-nums text-ink-400">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                aria-label="Zoom in"
                disabled={zoom >= ZOOM_MAX || !sheet}
                onClick={zoomIn}
                className="touch-target rounded-xl border border-ink-600 text-ink-300 transition hover:border-gold-500/40 hover:text-gold-400 disabled:opacity-40"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                onClick={() => void toggleFullscreen()}
                className="touch-target rounded-xl border border-ink-600 text-ink-300 transition hover:border-gold-500/40 hover:text-gold-400"
              >
                {fullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="sheet-canvas min-h-0 flex-1 overflow-auto px-2 pb-2 sm:px-4">
              {sheet ? (
                imageFailed ? (
                  <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-dashed border-ink-700 px-6 py-16 text-center">
                    <p className="max-w-sm text-sm text-ink-400">
                      Couldn’t load this chord sheet image. Exit Worship Mode and check the sheet in
                      the plan editor.
                    </p>
                  </div>
                ) : (
                  <div className="flex min-h-full items-start justify-center">
                    <img
                      src={sheet.imageUrl}
                      alt={`${hymnName} chord sheet`}
                      className="max-w-none origin-top rounded-sm bg-white shadow-xl transition-[width] duration-150"
                      style={{
                        width: `${zoom * 100}%`,
                        maxWidth: zoom === 1 ? '100%' : undefined,
                      }}
                      draggable={false}
                      onError={() => setImageFailed(true)}
                    />
                  </div>
                )
              ) : (
                <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-dashed border-ink-700 px-6 py-16 text-center">
                  <p className="max-w-sm text-sm text-ink-400">
                    No chord sheet selected for this hymn. Exit Worship Mode to choose one in the
                    plan editor.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="safe-area-pb shrink-0 border-t border-ink-800/80 bg-ink-950/95 px-3 py-3 backdrop-blur sm:px-5">
        <div className="mx-auto flex max-w-3xl items-stretch gap-2 sm:gap-3">
          <button
            type="button"
            disabled={!canPrev}
            onClick={goPrev}
            className={cn(
              'inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-ink-600 px-3 text-sm font-medium text-ink-200 transition',
              'hover:border-gold-500/40 hover:text-gold-400',
              'disabled:cursor-not-allowed disabled:opacity-40',
              'active:scale-[0.99]',
            )}
          >
            <ChevronLeft className="h-5 w-5" />
            Previous
          </button>
          <button
            type="button"
            disabled={!canNext}
            onClick={goNext}
            className={cn(
              'inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gold-500 px-3 text-sm font-medium text-white transition',
              'hover:bg-gold-400',
              'disabled:cursor-not-allowed disabled:opacity-40',
              'active:scale-[0.99]',
            )}
          >
            {isNote ? 'Continue' : 'Next'}
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 hidden text-center text-[11px] text-ink-600 sm:block">
          ← → navigate · Esc exit
        </p>
      </footer>
    </div>
  )
}
