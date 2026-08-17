import { useEffect, useState } from 'react'

/**
 * The suite's destructive pattern: a quiet `×` that swaps in place to
 * `[sure?] [×]`. No browser dialog, no modal. Arms itself back down after a
 * few seconds so a stray tap never leaves a live trigger sitting there.
 */
export default function ConfirmDelete({
  onConfirm,
  title = 'delete',
}: {
  onConfirm: () => void
  title?: string
}) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])

  if (!armed) {
    return (
      <button
        className="btn-small btn-ghost danger-hover"
        onClick={() => setArmed(true)}
        aria-label={title}
        title={title}
      >
        ×
      </button>
    )
  }

  return (
    <span className="row confirm-row">
      <button className="btn-small btn-danger" onClick={onConfirm}>
        sure?
      </button>
      <button className="btn-small btn-ghost" onClick={() => setArmed(false)} aria-label="cancel">
        ×
      </button>
    </span>
  )
}
