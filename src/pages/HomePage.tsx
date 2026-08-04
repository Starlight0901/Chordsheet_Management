import { Link } from 'react-router-dom'
import {
  BookOpen,
  CalendarHeart,
  Filter,
  Heart,
  Library,
  ListMusic,
} from 'lucide-react'
import { PageHeader } from '../components/ui/EmptyState'
import { useAuth } from '../context/AuthContext'

const shortcuts = [
  {
    to: '/hymns',
    title: 'Hymn library',
    description: 'Search, filter, and open shared chord sheets.',
    icon: Library,
  },
  {
    to: '/favorites',
    title: 'Favorites',
    description: 'Your private hearted hymns for quick access.',
    icon: Heart,
  },
  {
    to: '/lists',
    title: 'My lists',
    description: 'Practice lists with drag-and-drop order.',
    icon: ListMusic,
  },
  {
    to: '/worship',
    title: 'Worship',
    description: 'Build a set and enter distraction-free Worship Mode.',
    icon: CalendarHeart,
  },
  {
    to: '/smart-lists',
    title: 'Smart lists',
    description: 'Saved filters that update as the library changes.',
    icon: Filter,
  },
]

export function HomePage() {
  const { currentUser } = useAuth()
  const name = currentUser?.displayName?.split(' ')[0]

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="HymnBook"
        title={name ? `Welcome... 🤍` : 'Welcome'}
        // description="Large readable sheets, quick favorites, and Worship Mode built for phones."
      />


      <section
        aria-label="Bible verse"
        className="mb-5 rounded-2xl border border-ink-700 bg-ink-800 px-4 py-4 shadow-sm sm:mb-6 sm:px-5 sm:py-4"
      >
        <BookOpen className="mb-3 h-4 w-4 text-gold-500" strokeWidth={1.75} aria-hidden />

        <blockquote className="space-y-4">
          <div>
            <p className="font-display text-sm leading-relaxed text-ink-100 sm:text-[0.95rem]">
              Yet a time is coming and has now come when the true worshipers will worship the Father
              in the Spirit and in truth, for they are the kind of worshipers the Father seeks.
            </p>
            <p className="mt-2 font-display text-sm leading-relaxed text-ink-100 sm:text-[0.95rem]">
              God is spirit, and his worshipers must worship in the Spirit and in truth.
            </p>
            <footer className="mt-2 text-xs font-medium text-gold-500">— John 4:23-24</footer>
          </div>

          <div className="border-t border-ink-700/60 pt-4">
            <p className="font-display text-sm leading-relaxed text-ink-200 sm:text-[0.95rem]">
              නුමුත් සැබෑ නමස්කාරකරන්නන් විසින් ආත්මයෙන්ද සැබෑකමෙන්ද පියාණන්වහන්සේට නමස්කාරකරන
              කාලය පැමිණෙන්නේය, දැනටම පැමිණ තිබේ. මක්නිසාද පියාණන්වහන්සේ තමන්ට නමස්කාරකරන්නන් වන
              පිණිස එබඳුවූවන් සොයනසේක.
            </p>
            <p className="mt-2 font-display text-sm leading-relaxed text-ink-200 sm:text-[0.95rem]">
              දෙවියන්වහන්සේ ආත්මයක්ය. උන්වහන්සේට නමස්කාරකරන්නන් විසින් ආත්මයෙන්ද සැබෑකමෙන්ද
              නමස්කාරකළ යුතුයයි කීසේක.
            </p>
            <footer className="mt-2 text-xs font-medium text-gold-500">— ශු. යොහන් 4:23-24</footer>
          </div>
        </blockquote>
      </section>

      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        {shortcuts.map(({ to, title, description, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="group ui-card flex h-full min-h-[5.5rem] flex-col items-center gap-2 p-2.5 text-center transition hover:border-gold-500/40 hover:shadow-md active:scale-[0.99] sm:min-h-[7.5rem] sm:items-start sm:gap-3 sm:p-5 sm:text-left"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-600 bg-ink-900/40 text-gold-500 transition group-hover:border-gold-500/40 group-hover:bg-gold-500/10 sm:h-11 sm:w-11">
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 w-full">
                <h3 className="text-xs font-medium text-ink-100 transition group-hover:text-gold-500 sm:text-sm">
                  {title}
                </h3>
                <p className="mt-1 hidden text-sm leading-relaxed text-ink-400 sm:block">
                  {description}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
