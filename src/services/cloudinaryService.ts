export type CloudinaryUploadErrorCode =
  | 'missing_config'
  | 'invalid_type'
  | 'file_too_large'
  | 'upload_failed'
  | 'aborted'

export class CloudinaryUploadError extends Error {
  readonly code: CloudinaryUploadErrorCode

  constructor(code: CloudinaryUploadErrorCode, message: string) {
    super(message)
    this.name = 'CloudinaryUploadError'
    this.code = code
  }
}

/** Result returned by Cloudinary after a successful unsigned image upload. */
export interface CloudinaryUploadResult {
  secureUrl: string
  publicId: string
  originalFileName: string | null
  width: number
  height: number
  format: string
  bytes: number
}

export interface UploadChordSheetOptions {
  /** Hymn id used to place the file under hymnbook/hymns/{hymnId}/chordSheets/ */
  hymnId: string
  /** Optional 0–100 upload progress callback (XHR). */
  onProgress?: (progress: number) => void
  /** Optional AbortSignal to cancel the upload. */
  signal?: AbortSignal
}

/** Metadata shape to persist in Firestore after a Cloudinary upload (no binary). */
export interface ChordSheetFirestoreFields {
  hymnId: string
  imageUrl: string
  cloudinaryPublicId: string
  originalFileName: string
  order: number
  uploadedBy: string
}

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg'])

const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg'])

/** 10 MB — chord sheets should stay well under this. */
export const MAX_CHORD_SHEET_BYTES = 10 * 1024 * 1024

function getCloudinaryConfig(): { cloudName: string; uploadPreset: string } {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim()
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim()

  if (!cloudName || !uploadPreset) {
    throw new CloudinaryUploadError(
      'missing_config',
      'Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.',
    )
  }

  return { cloudName, uploadPreset }
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim() &&
      import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim(),
  )
}

export function getChordSheetFolder(hymnId: string): string {
  const safeId = hymnId.trim()
  if (!safeId) {
    throw new CloudinaryUploadError('upload_failed', 'A hymn id is required for the Cloudinary folder path.')
  }
  return `hymnbook/hymns/${safeId}/chordSheets`
}

function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.')
  return parts.length > 1 ? parts[parts.length - 1]! : ''
}

export function validateChordSheetFile(file: File): void {
  const extension = getFileExtension(file.name)
  const mimeOk = ALLOWED_MIME_TYPES.has(file.type)
  const extensionOk = ALLOWED_EXTENSIONS.has(extension)

  if (!mimeOk && !extensionOk) {
    throw new CloudinaryUploadError(
      'invalid_type',
      'Invalid file type. Upload a PNG or JPG chord-sheet image.',
    )
  }

  if (file.size <= 0) {
    throw new CloudinaryUploadError('invalid_type', 'The selected file is empty.')
  }

  if (file.size > MAX_CHORD_SHEET_BYTES) {
    const maxMb = MAX_CHORD_SHEET_BYTES / (1024 * 1024)
    throw new CloudinaryUploadError(
      'file_too_large',
      `File is too large. Maximum size is ${maxMb} MB.`,
    )
  }
}

interface CloudinaryApiResponse {
  secure_url?: string
  public_id?: string
  original_filename?: string
  width?: number
  height?: number
  format?: string
  bytes?: number
  error?: { message?: string }
}

function mapCloudinaryResponse(data: CloudinaryApiResponse): CloudinaryUploadResult {
  if (
    !data.secure_url ||
    !data.public_id ||
    typeof data.width !== 'number' ||
    typeof data.height !== 'number' ||
    !data.format ||
    typeof data.bytes !== 'number'
  ) {
    throw new CloudinaryUploadError(
      'upload_failed',
      'Cloudinary returned an incomplete upload response.',
    )
  }

  return {
    secureUrl: data.secure_url,
    publicId: data.public_id,
    originalFileName: data.original_filename ?? null,
    width: data.width,
    height: data.height,
    format: data.format,
    bytes: data.bytes,
  }
}

/**
 * Upload a chord-sheet image to Cloudinary via an unsigned browser upload.
 * Images live in Cloudinary; persist only metadata in Firestore afterward.
 */
export function uploadChordSheetImage(
  file: File,
  options: UploadChordSheetOptions,
): Promise<CloudinaryUploadResult> {
  validateChordSheetFile(file)

  const { cloudName, uploadPreset } = getCloudinaryConfig()
  const folder = getChordSheetFolder(options.hymnId)
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', folder)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    const abort = () => {
      xhr.abort()
    }

    if (options.signal) {
      if (options.signal.aborted) {
        reject(new CloudinaryUploadError('aborted', 'Upload was cancelled.'))
        return
      }
      options.signal.addEventListener('abort', abort, { once: true })
    }

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable || !options.onProgress) return
      const progress = Math.round((event.loaded / event.total) * 100)
      options.onProgress(progress)
    })

    xhr.addEventListener('load', () => {
      options.signal?.removeEventListener('abort', abort)

      let data: CloudinaryApiResponse
      try {
        data = JSON.parse(xhr.responseText) as CloudinaryApiResponse
      } catch {
        reject(
          new CloudinaryUploadError('upload_failed', 'Failed to parse Cloudinary upload response.'),
        )
        return
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(
          new CloudinaryUploadError(
            'upload_failed',
            data.error?.message ?? `Cloudinary upload failed (${xhr.status}).`,
          ),
        )
        return
      }

      try {
        options.onProgress?.(100)
        resolve(mapCloudinaryResponse(data))
      } catch (error) {
        reject(error)
      }
    })

    xhr.addEventListener('error', () => {
      options.signal?.removeEventListener('abort', abort)
      reject(new CloudinaryUploadError('upload_failed', 'Network error while uploading to Cloudinary.'))
    })

    xhr.addEventListener('abort', () => {
      options.signal?.removeEventListener('abort', abort)
      reject(new CloudinaryUploadError('aborted', 'Upload was cancelled.'))
    })

    xhr.open('POST', url)
    xhr.send(formData)
  })
}

/** Build Firestore-ready chord-sheet fields from a Cloudinary upload result. */
export function toChordSheetFirestoreFields(
  result: CloudinaryUploadResult,
  params: {
    hymnId: string
    order: number
    uploadedBy: string
  },
): ChordSheetFirestoreFields {
  return {
    hymnId: params.hymnId,
    imageUrl: result.secureUrl,
    cloudinaryPublicId: result.publicId,
    originalFileName: result.originalFileName ?? 'untitled',
    order: params.order,
    uploadedBy: params.uploadedBy,
  }
}
