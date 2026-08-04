import { Moon, Sun } from 'lucide-react'
import { isFirebaseConfigured } from '../firebase/config'
import { isCloudinaryConfigured } from '../services/cloudinaryService'
import { UserTagManager } from '../components/hymns/UserTagManager'
import { PageHeader } from '../components/ui/EmptyState'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export function SettingsPage() {
  const { currentUser } = useAuth()
  const { theme, setTheme } = useTheme()

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Theme, private tags, and connection status."
      />

      <div className="space-y-5">
        <section className="ui-card p-5">
          <h3 className="text-sm font-medium text-ink-100">Appearance</h3>
          <p className="mt-1 text-xs text-ink-500">
            Light for daytime prep, dark for stage and low light.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTheme('light')}
              aria-pressed={theme === 'light'}
              className={
                theme === 'light'
                  ? 'flex items-center justify-center gap-2 rounded-xl border border-gold-500/45 bg-gold-500/15 px-3 py-3 text-sm font-medium text-gold-500'
                  : 'flex items-center justify-center gap-2 rounded-xl border border-ink-600 bg-ink-900/40 px-3 py-3 text-sm text-ink-300 hover:border-ink-500'
              }
            >
              <Sun className="h-4 w-4" />
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              aria-pressed={theme === 'dark'}
              className={
                theme === 'dark'
                  ? 'flex items-center justify-center gap-2 rounded-xl border border-gold-500/45 bg-gold-500/15 px-3 py-3 text-sm font-medium text-gold-500'
                  : 'flex items-center justify-center gap-2 rounded-xl border border-ink-600 bg-ink-900/40 px-3 py-3 text-sm text-ink-300 hover:border-ink-500'
              }
            >
              <Moon className="h-4 w-4" />
              Dark
            </button>
          </div>
        </section>

        {currentUser && <UserTagManager userId={currentUser.uid} />}

        <section className="ui-card space-y-4 p-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-ink-300">Firebase</span>
            <span
              className={
                isFirebaseConfigured
                  ? 'text-sm font-medium text-gold-500'
                  : 'text-sm font-medium text-ink-400'
              }
            >
              {isFirebaseConfigured ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-ink-300">Cloudinary</span>
            <span
              className={
                isCloudinaryConfigured()
                  ? 'text-sm font-medium text-gold-500'
                  : 'text-sm font-medium text-ink-400'
              }
            >
              {isCloudinaryConfigured() ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-ink-500">
            Firebase handles auth and Firestore. Chord-sheet images upload to Cloudinary via an
            unsigned preset — never put API secrets in the frontend.
          </p>
        </section>
      </div>
    </div>
  )
}
