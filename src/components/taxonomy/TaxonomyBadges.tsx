import { cn } from '../../utils/cn'
import {
  isHymnCategory,
  isHymnLanguage,
  type HymnCategory,
  type HymnLanguage,
} from '../../constants/taxonomy'

interface TaxonomyBadgesProps {
  languages?: readonly string[]
  categories?: readonly string[]
  className?: string
}

/** Read-only language/category chips for hymn details and list rows. */
export function TaxonomyBadges({ languages = [], categories = [], className }: TaxonomyBadgesProps) {
  const knownLanguages = languages.filter(isHymnLanguage) as HymnLanguage[]
  const knownCategories = categories.filter(isHymnCategory) as HymnCategory[]

  if (knownLanguages.length === 0 && knownCategories.length === 0) {
    return null
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {knownLanguages.map((language) => (
        <span
          key={`lang-${language}`}
          className="rounded-full border border-ink-600 bg-ink-900/50 px-2.5 py-1 text-xs text-ink-300"
        >
          {language}
        </span>
      ))}
      {knownCategories.map((category) => (
        <span
          key={`cat-${category}`}
          className="rounded-full border border-ink-600 bg-ink-900/40 px-2.5 py-1 text-xs text-ink-300"
        >
          {category}
        </span>
      ))}
    </div>
  )
}
