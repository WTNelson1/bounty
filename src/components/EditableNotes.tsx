import { useEffect, useRef, useState } from 'react'

/**
 * Tap-to-edit multi-line notes. Blur saves, Escape cancels, Enter makes a new
 * line. Unlike EditableText, empty is a valid value — clearing the notes is a
 * thing you're allowed to do. When empty it shows a quiet mono prompt so the
 * field is still findable.
 */
export default function EditableNotes({
  value,
  onSave,
  placeholder = '＋ notes',
}: {
  value: string
  onSave: (next: string) => void
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!editing) return
    const el = ref.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [editing])

  function commit() {
    if (draft !== value) onSave(draft.trim())
    setEditing(false)
  }

  if (!editing) {
    return (
      <p
        className={`notes-body editable ${value ? '' : 'empty'}`}
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
        title="tap to edit"
      >
        {value || placeholder}
      </p>
    )
  }

  return (
    <textarea
      ref={ref}
      className="notes-input"
      value={draft}
      rows={3}
      onChange={(e) => {
        setDraft(e.target.value)
        e.target.style.height = 'auto'
        e.target.style.height = `${e.target.scrollHeight}px`
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setEditing(false)
      }}
    />
  )
}
