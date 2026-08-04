import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { ChordSheet } from '../../types'
import { cn } from '../../utils/cn'

interface ChordSheetViewerProps {
  sheets: ChordSheet[]
  index: number
  onIndexChange: (index: number) => void
  className?: string
}

const ZOOM_MIN = 1
const ZOOM_MAX = 3
const ZOOM_STEP = 0.25

export function ChordSheetViewer({
  sheets,
  index,
  onIndexChange,
  className,
}: ChordSheetViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  const sheet = sheets[index]
  const total = sheets.length
  const canPrev = index > 0
  const canNext = index < total - 1

  useEffect(() => {
    setZoom(1)
    setImageFailed(false)
  }, [index, sheet?.id])

  useEffect(() => {
    function onFullscreenChange() {
      setFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current
    if (!el) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await el.requestFullscreen()
      }
    } catch {
      // Fullscreen may be blocked by the browser.
    }
  }, [])

  function zoomIn() {
    setZoom((current) => Math.min(ZOOM_MAX, Math.round((current + ZOOM_STEP) * 100) / 100))
  }

  function zoomOut() {
    setZoom((current) => Math.max(ZOOM_MIN, Math.round((current - ZOOM_STEP) * 100) / 100))
  }

  if (!sheet) {
    return (
      <div
        className={cn(
          'flex min-h-[50vh] items-center justify-center rounded-2xl border border-dashed border-ink-600 bg-ink-800/30 px-6 py-16 text-center',
          className,
        )}
      >
        <p className="text-sm text-ink-400">No chord sheets to display.</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-ink-700/70 bg-ink-850 shadow-sm',
        fullscreen && 'rounded-none border-0',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-700/70 bg-ink-800/80 px-2.5 py-2.5 sm:px-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous sheet"
            disabled={!canPrev}
            onClick={() => onIndexChange(index - 1)}
            className="touch-target rounded-xl border border-ink-600 text-ink-300 transition hover:border-gold-500/40 hover:text-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[4.5rem] text-center text-sm font-medium tabular-nums text-ink-200">
            {index + 1} / {total}
          </span>
          <button
            type="button"
            aria-label="Next sheet"
            disabled={!canNext}
            onClick={() => onIndexChange(index + 1)}
            className="touch-target rounded-xl border border-ink-600 text-ink-300 transition hover:border-gold-500/40 hover:text-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <p
          className="order-last w-full truncate text-center text-xs text-ink-500 sm:order-none sm:w-auto sm:max-w-[40%] sm:text-left"
          title={sheet.originalFileName}
        >
          {sheet.originalFileName || `Sheet ${index + 1}`}
        </p>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={zoom <= ZOOM_MIN}
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
            disabled={zoom >= ZOOM_MAX}
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
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          'relative flex-1 overflow-auto overscroll-contain sheet-canvas',
          fullscreen ? 'min-h-dvh' : 'min-h-[62dvh] sm:min-h-[70vh]',
        )}
      >
        <div className="flex min-h-full items-start justify-center p-1.5 sm:p-5">
          {imageFailed ? (
            <div className="flex min-h-[40vh] w-full max-w-lg flex-col items-center justify-center rounded-2xl border border-dashed border-ink-600 px-6 py-16 text-center">
              <p className="text-sm font-medium text-ink-200">Couldn’t load this chord sheet image</p>
              <p className="mt-2 text-xs text-ink-500">
                The Cloudinary URL may be missing or unreachable. Try refreshing, or re-upload the
                sheet from Edit hymn.
              </p>
            </div>
          ) : (
            <img
              src={sheet.imageUrl}
              alt={sheet.originalFileName || `Chord sheet ${index + 1}`}
              className="max-w-none origin-top rounded-sm bg-white shadow-xl transition-transform duration-150"
              style={{
                width: `${zoom * 100}%`,
                maxWidth: zoom === 1 ? '100%' : undefined,
              }}
              draggable={false}
              onError={() => setImageFailed(true)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
