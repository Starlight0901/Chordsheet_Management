import type { ReactNode } from 'react'
import { PageHeader } from './ui/EmptyState'

interface PagePlaceholderProps {
  title: string
  description: string
  eyebrow?: string
  children?: ReactNode
}

export function PagePlaceholder({
  title,
  description,
  eyebrow = 'HymnBook',
  children,
}: PagePlaceholderProps) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      {children}
    </div>
  )
}
