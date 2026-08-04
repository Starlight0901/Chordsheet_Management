import { Menu, Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

interface TopBarProps {
  title: string
  onMenuClick: () => void
}

export function TopBar({ title, onMenuClick }: TopBarProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="safe-area-pt sticky top-0 z-30 flex items-center gap-2 border-b border-ink-700 bg-ink-850/95 px-3 py-2.5 backdrop-blur-md sm:gap-3 sm:px-6 sm:py-3">
      <button
        type="button"
        onClick={onMenuClick}
        className="touch-target rounded-xl text-ink-300 transition hover:bg-ink-700 hover:text-ink-100 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="min-w-0 flex-1 truncate font-display text-xl font-semibold tracking-wide text-ink-100 sm:text-2xl">
        {title}
      </h1>
      <button
        type="button"
        onClick={toggleTheme}
        className="touch-target rounded-xl border border-ink-600 text-ink-300 transition hover:border-gold-500/40 hover:text-gold-500"
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </header>
  )
}
