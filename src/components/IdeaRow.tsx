import { Link } from 'react-router-dom'
import { db, deleteIdeaTree, patch, type Idea } from '../db'
import { displayPrice } from '../capture'
import ConfirmDelete from './ConfirmDelete'

/**
 * One idea in a list. Lists navigate, detail pages edit — tapping the title
 * opens the idea rather than turning into an input.
 *
 * `◇ / ◆` is the one status: the diamond fills when it's bought.
 */
export default function IdeaRow({
  idea,
  subCount = 0,
  rolledPrice = '',
  sub = false,
}: {
  idea: Idea
  /** live sub-ideas nested under this one, shown as a count */
  subCount?: number
  /** a category's own price is empty — this is the range its candidates cover */
  rolledPrice?: string
  /** render as a nested candidate rather than a top-level idea */
  sub?: boolean
}) {
  async function toggleBought() {
    await patch(
      db.ideas,
      idea.id,
      idea.bought ? { bought: 0, boughtAt: undefined } : { bought: 1, boughtAt: Date.now() },
    )
  }

  return (
    <div className={`idea-row ${sub ? 'sub' : ''} ${idea.bought ? 'bought' : ''}`}>
      <button
        className="claim"
        onClick={toggleBought}
        aria-label={idea.bought ? 'mark not bought' : 'mark bought'}
        title={idea.bought ? 'not bought after all' : 'bought'}
      >
        {idea.bought ? '◆' : '◇'}
      </button>

      <Link to={`/p/${idea.personId}/i/${idea.id}`} className="idea-title">
        <span className="title-text">{idea.title}</span>
        {idea.notes && <span className="row-note">{idea.notes}</span>}
      </Link>

      {subCount > 0 && <span className="meta">·{subCount}</span>}
      {idea.links.length > 0 && (
        <span className="meta link-flag" title={`${idea.links.length} link(s)`}>
          ⚭
        </span>
      )}
      {idea.price ? (
        <span className="meta price">{displayPrice(idea.price)}</span>
      ) : (
        rolledPrice && (
          <span className="meta price rolled" title="range across its versions">
            {rolledPrice}
          </span>
        )
      )}

      <ConfirmDelete onConfirm={() => deleteIdeaTree(idea.id)} />
    </div>
  )
}
