import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ImagePlus, Upload } from 'lucide-react'
import {
  CloudinaryUploadError,
  MAX_CHORD_SHEET_BYTES,
  validateChordSheetFile,
} from '../../services/cloudinaryService'
import { cn } from '../../utils/cn'

interface ImageUploaderProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
  className?: string
}

function collectValidFiles(fileList: FileList | File[]): { files: File[]; errors: string[] } {
  const files: File[] = []
  const errors: string[] = []

  for (const file of Array.from(fileList)) {
    try {
      validateChordSheetFile(file)
      files.push(file)
    } catch (error) {
      if (error instanceof CloudinaryUploadError) {
        errors.push(`${file.name}: ${error.message}`)
      } else {
        errors.push(`${file.name}: Invalid file.`)
      }
    }
  }

  return { files, errors }
}

export function ImageUploader({ onFilesSelected, disabled, className }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [localErrors, setLocalErrors] = useState<string[]>([])

  const maxMb = MAX_CHORD_SHEET_BYTES / (1024 * 1024)

  function handleFiles(fileList: FileList | File[]) {
    const { files, errors } = collectValidFiles(fileList)
    setLocalErrors(errors)
    if (files.length > 0) {
      onFilesSelected(files)
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files?.length) return
    handleFiles(event.target.files)
    event.target.value = ''
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    if (disabled) return
    if (event.dataTransfer.files.length) {
      handleFiles(event.dataTransfer.files)
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-10 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 disabled:cursor-not-allowed disabled:opacity-50',
          dragging
            ? 'border-gold-500/60 bg-gold-500/10'
            : 'border-ink-600 bg-ink-900/30 hover:border-ink-500 hover:bg-ink-800/40',
        )}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-600 bg-ink-800/60 text-gold-400">
          {dragging ? <Upload className="h-5 w-5" /> : <ImagePlus className="h-5 w-5" />}
        </div>
        <div>
          <p className="text-sm font-medium text-ink-100">
            {dragging ? 'Drop images to add' : 'Add chord-sheet images'}
          </p>
          <p className="mt-1 text-xs text-ink-400">
            PNG or JPG · up to {maxMb} MB each · multiple files allowed
          </p>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={onInputChange}
      />

      {localErrors.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-xl border border-ember-500/35 bg-ember-500/10 px-3.5 py-3 text-xs text-ember-500">
          {localErrors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
