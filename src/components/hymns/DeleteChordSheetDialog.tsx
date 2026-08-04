import { DeletionPasswordDialog } from './DeletionPasswordDialog'

interface DeleteChordSheetDialogProps {
  open: boolean
  fileName: string
  busy?: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: (deletionPassword: string) => void
}

export function DeleteChordSheetDialog({
  open,
  fileName,
  busy,
  error,
  onCancel,
  onConfirm,
}: DeleteChordSheetDialogProps) {
  return (
    <DeletionPasswordDialog
      open={open}
      title="Delete chord sheet"
      description={`Delete “${fileName}” metadata from Firestore. The Cloudinary image is not deleted automatically. This confirmation password is only an accidental-deletion barrier — not cryptographic security.`}
      confirmLabel="Delete sheet"
      busy={busy}
      error={error}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
