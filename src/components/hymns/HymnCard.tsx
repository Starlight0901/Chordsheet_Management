import { Music2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FavoriteButton } from './FavoriteButton'
import { TaxonomyBadges } from '../taxonomy'
import type { Hymn } from '../../types'

interface HymnCardProps {
  hymn: Hymn
  chordSheetCount: number
  isFavorite: boolean
  favoriteBusy?: boolean
  onToggleFavorite: (hymnId: string, next: boolean) => void
}

export function HymnCard({
  hymn,
  chordSheetCount,
  isFavorite,
  favoriteBusy,
  onToggleFavorite,
}: HymnCardProps) {
  const sheetLabel =
    chordSheetCount === 1 ? '1 chord sheet' : `${chordSheetCount} chord sheets`

  return (
    <article className="group ui-card relative transition hover:border-gold-500/40 hover:bg-ink-800">
      <Link
        to={`/hymns/${hymn.id}`}
        className="block p-4 pr-14 sm:p-5 sm:pr-16"
        aria-label={`Open ${hymn.name}`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink-600 bg-ink-900/50 text-gold-400">
            <Music2 className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-xl font-semibold text-ink-100 transition group-hover:text-gold-400 sm:text-2xl">
              {hymn.name}
            </h3>
            <p className="mt-1 text-xs text-ink-400">{sheetLabel}</p>
            <TaxonomyBadges
              languages={hymn.languages}
              categories={hymn.categories}
              className="mt-3"
            />
          </div>
        </div>
      </Link>

      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
        <FavoriteButton
          isFavorite={isFavorite}
          busy={favoriteBusy}
          onToggle={(next) => onToggleFavorite(hymn.id, next)}
          label={hymn.name}
          size="sm"
        />
      </div>
    </article>
  )
}
