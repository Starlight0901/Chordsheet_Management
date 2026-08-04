import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  CalendarHeart,
  Filter,
  Heart,
  Home,
  Library,
  ListMusic,
  LogOut,
  Moon,
  Settings,
  Sun,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { BrandMark } from './BrandMark'
import { cn } from '../utils/cn'

interface NavItem {
  to: string
  label: string
  icon: typeof Home
  end?: boolean
}

const primaryNav: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/hymns', label: 'Hymns', icon: Library },
  { to: '/favorites', label: 'Favorites', icon: Heart },
  { to: '/lists', label: 'My Lists', icon: ListMusic },
  { to: '/worship', label: 'Worship', icon: CalendarHeart },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const secondaryNav: NavItem[] = [{ to: '/smart-lists', label: 'Smart Lists', icon: Filter }]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { currentUser, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)

  async function handleLogout() {
    setLogoutError(null)
    setLoggingOut(true)
    try {
      await logout()
      onClose()
      navigate('/login', { replace: true })
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Unable to sign out.')
    } finally {
      setLoggingOut(false)
    }
  }

  function renderNav(items: NavItem[]) {
    return items.map(({ to, label, icon: Icon, end }) => (
      <NavLink
        key={to}
        to={to}
        end={end}
        onClick={onClose}
        className={({ isActive }) =>
          cn(
            'group flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition',
            isActive
              ? 'bg-gold-500/10 text-gold-500 ring-1 ring-gold-500/20'
              : 'text-ink-300 hover:bg-gold-500/5 hover:text-ink-100',
          )
        }
      >
        <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} />
        {label}
      </NavLink>
    ))
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-ink-950/50 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-ink-700 bg-ink-850 shadow-sm transition-transform duration-300 lg:static lg:w-72 lg:translate-x-0 lg:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink-700/60 px-4 py-4 safe-area-pt sm:px-5 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark />
            <div className="min-w-0">
              <p className="font-display text-2xl font-semibold leading-none tracking-wide text-ink-100">
                HymnBook
              </p>
              <p className="mt-1 text-xs tracking-wide text-ink-400">Chord sheets</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target rounded-xl text-ink-400 transition hover:bg-ink-700 hover:text-ink-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4" aria-label="Primary">
          {renderNav(primaryNav)}
          <div className="my-3 border-t border-ink-700/60 pt-3">
            <p className="mb-1 px-3 text-[10px] font-medium tracking-[0.16em] text-ink-500 uppercase">
              Filters
            </p>
            {renderNav(secondaryNav)}
          </div>
        </nav>

        <div className="safe-area-pb space-y-3 border-t border-ink-700/60 px-4 py-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-300 transition hover:bg-ink-700/70 hover:text-ink-100"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            ) : (
              <Moon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            )}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>

          {currentUser && (
            <div className="flex items-center gap-3 px-1">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover ring-1 ring-ink-600"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-700 text-sm font-medium text-ink-200">
                  {(currentUser.displayName ?? currentUser.email ?? '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-100">
                  {currentUser.displayName ?? 'Signed in'}
                </p>
                {currentUser.email && (
                  <p className="truncate text-xs text-ink-400">{currentUser.email}</p>
                )}
              </div>
            </div>
          )}

          {logoutError && (
            <p className="px-1 text-xs text-ember-500" role="alert">
              {logoutError}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-300 transition hover:bg-ink-700/70 hover:text-ink-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {loggingOut ? 'Signing out…' : 'Log out'}
          </button>
        </div>
      </aside>
    </>
  )
}
