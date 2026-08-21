import { useEffect, useRef, useState } from 'react'

/**
 * Tap-to-edit text. Enter or blur saves; Escape cancels.
 *
 * By default empty is ignored — a title or a name can't be blanked by a stray
 * tap. Optional fields (a price) pass `allowEmpty` so clearing works, and a
 * `placeholder` so the field is still findable when it holds nothing.
 */
export default function EditableText({
  value,
  onSave,
  className,
  allowEmpty = false,
  placeholder,
  display,
}: {
  value: string
  onSave: (next: string) => void
  className?: string
  allowEmpty?: boolean
  placeholder?: string
  /** what to show when not editing; tapping still edits the raw `value` */
  display?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      ref.current?.focus()
      ref.current?.select()
    }
  }, [editing])

  function commit() {
    const t = draft.trim()
    if ((t || allowEmpty) && t !== value) onSave(t)
    setEditing(false)
  }

  if (!editing) {
    return (
      <span
        className={`${className ?? ''} editable ${value ? '' : 'empty'}`}
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
        title="tap to edit"
      >
        {display || value || placeholder}
      </span>
    )
  }

  return (
    <input
      ref={ref}
      type="text"
      className={`${className ?? ''} editable-input`}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setEditing(false)
      }}
    />
  )
}
