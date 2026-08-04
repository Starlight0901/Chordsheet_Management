import { useState, type DragEvent } from 'react'
import { ChordSheetPreview } from './ChordSheetPreview'
import type { ChordSheetFormItem } from './chordSheetFormTypes'
import { moveChordSheetItem } from './chordSheetFormTypes'

interface ChordSheetReorderListProps {
  items: ChordSheetFormItem[]
  onChange: (next: ChordSheetFormItem[]) => void
  onRemove: (id: string) => void
  onRetry?: (id: string) => void
  disabled?: boolean
}

export function ChordSheetReorderList({
  items,
  onChange,
  onRemove,
  onRetry,
  disabled,
}: ChordSheetReorderListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  if (items.length === 0) {
    return null
  }

  function handleDragStart(index: number) {
    return (event: DragEvent) => {
      if (disabled) {
        event.preventDefault()
        return
      }
      setDragIndex(index)
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', String(index))
    }
  }

  function handleDragOver(index: number) {
    return (event: DragEvent) => {
      if (disabled || dragIndex === null) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      if (overIndex !== index) {
        setOverIndex(index)
      }
    }
  }

  function handleDrop(index: number) {
    return (event: DragEvent) => {
      event.preventDefault()
      if (disabled || dragIndex === null) return
      onChange(moveChordSheetItem(items, dragIndex, index))
      setDragIndex(null)
      setOverIndex(null)
    }
  }

  function handleDragEnd() {
    setDragIndex(null)
    setOverIndex(null)
  }

  return (
    <ul className="space-y-2" aria-label="Chord sheet order">
      {items.map((item, index) => (
        <li key={item.id} onDragOver={handleDragOver(index)} onDrop={handleDrop(index)}>
          <ChordSheetPreview
            item={item}
            index={index}
            disabled={disabled}
            onRemove={onRemove}
            onRetry={onRetry}
            isDragging={dragIndex === index}
            isDropTarget={overIndex === index && dragIndex !== index}
            dragHandleProps={{
              draggable: !disabled,
              onDragStart: handleDragStart(index),
              onDragEnd: handleDragEnd,
            }}
          />
        </li>
      ))}
    </ul>
  )
}
