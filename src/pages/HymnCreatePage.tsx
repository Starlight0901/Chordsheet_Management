import { useNavigate } from 'react-router-dom'
import { HymnForm } from '../components/hymns/HymnForm'
import { useAuth } from '../context/AuthContext'
import { isCloudinaryConfigured } from '../services/cloudinaryService'

export function HymnCreatePage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  if (!currentUser) {
    return null
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 sm:mb-8">
        <p className="mb-2 text-sm font-medium tracking-[0.18em] text-gold-500 uppercase">
          Shared library
        </p>
        <h2 className="font-display text-3xl font-semibold text-ink-100 sm:text-4xl">Add hymn</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-300 sm:text-base">
          Create a shared hymn and upload chord-sheet images to Cloudinary.
        </p>
      </div>

      {!isCloudinaryConfigured() && (
        <div className="mb-5 rounded-xl border border-ember-500/40 bg-ember-500/10 px-4 py-3 text-sm text-ember-500">
          Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and
          VITE_CLOUDINARY_UPLOAD_PRESET before uploading images.
        </div>
      )}

      <div className="rounded-2xl border border-ink-700/70 bg-ink-800/40 p-4 sm:p-6">
        <HymnForm
          mode="create"
          userId={currentUser.uid}
          onCancel={() => navigate('/hymns')}
          onSuccess={({ hymn }) => navigate(`/hymns/${hymn.id}`, { replace: true })}
        />
      </div>
    </div>
  )
}
