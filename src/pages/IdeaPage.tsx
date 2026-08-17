import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, alive, deleteIdeaTree, linkLabel, newRec, normaliseUrl, patch } from '../db'
import EditableText from '../components/EditableText'
import EditableNotes from '../components/EditableNotes'
import ConfirmDelete from '../components/ConfirmDelete'
import IdeaRow from '../components/IdeaRow'

export default function IdeaPage() {
  const { personId = '', ideaId = '' } = useParams()
  const navigate = useNavigate()
  const [subText, setSubText] = useState('')
  const [linkText, setLinkText] = useState('')
  const [addingLink, setAddingLink] = useState(false)

  const idea = useLiveQuery(() => db.ideas.get(ideaId), [ideaId])
  const person = useLiveQuery(() => db.people.get(personId), [personId])
  const subs =
    useLiveQuery(
      async () => (await db.ideas.where('parentId').equals(ideaId).toArray()).filter(alive),
      [ideaId],
    ) ?? []

  if (!idea || !alive(idea)) {
    return (
      <div className="card">
        <p className="muted small">
          that idea isn't here · <Link to={`/p/${personId}`}>back</Link>
        </p>
      </div>
    )
  }

  // one level of nesting only: a sub-idea has no sub-ideas of its own
  const isSub = !!idea.parentId
  const liveSubs = subs.filter((s) => !s.bought).sort((a, b) => b.createdAt - a.createdAt)
  const boughtSubs = subs
    .filter((s) => s.bought)
    .sort((a, b) => (b.boughtAt ?? b.updatedAt) - (a.boughtAt ?? a.updatedAt))

  async function addSub() {
    const title = subText.trim()
    if (!title) return
    await db.ideas.add({
      ...newRec(),
      personId,
      parentId: ideaId,
      title,
      notes: '',
      links: [],
      price: '',
      bought: 0,
    })
    setSubText('')
  }

  async function addLink() {
    const url = normaliseUrl(linkText)
    if (!url || !idea) return
    await patch(db.ideas, ideaId, { links: [...idea.links, url] })
    setLinkText('')
    setAddingLink(false)
  }

  async function removeLink(url: string) {
    if (!idea) return
    await patch(db.ideas, ideaId, { links: idea.links.filter((l) => l !== url) })
  }

  async function toggleBought() {
    if (!idea) return
    await patch(
      db.ideas,
      ideaId,
      idea.bought ? { bought: 0, boughtAt: undefined } : { bought: 1, boughtAt: Date.now() },
    )
  }

  return (
    <div>
      <p className="crumb">
        <Link to={`/p/${personId}`}>← {person?.name ?? 'back'}</Link>
        {isSub && <span className="meta"> · under a category</span>}
      </p>

      <div className="card">
        <h2 className="row-between">
          <span>{isSub ? 'candidate' : 'idea'}</span>
          <span className="row">
            <button
              className={`claim ${idea.bought ? 'on' : ''}`}
              onClick={toggleBought}
              title={idea.bought ? 'not bought after all' : 'bought'}
            >
              {idea.bought ? '◆ bought' : '◇ bought'}
            </button>
            <ConfirmDelete
              onConfirm={async () => {
                await deleteIdeaTree(ideaId)
                navigate(`/p/${personId}`)
              }}
            />
          </span>
        </h2>

        <h3 className="entity-name">
          <EditableText value={idea.title} onSave={(title) => patch(db.ideas, ideaId, { title })} />
        </h3>

        <p className="price-line">
          {idea.price && <span className="micro-label tight">price</span>}{' '}
          <EditableText
            value={idea.price}
            allowEmpty
            placeholder="＋ price"
            onSave={(price) => patch(db.ideas, ideaId, { price })}
          />
        </p>

        <EditableNotes
          value={idea.notes}
          onSave={(notes) => patch(db.ideas, ideaId, { notes })}
          placeholder="＋ notes"
        />

        <div className="links">
          {idea.links.map((l) => (
            <div key={l} className="link-row">
              <a href={l} target="_blank" rel="noreferrer">
                ↗ {linkLabel(l)}
              </a>
              <button
                className="btn-small btn-ghost danger-hover"
                onClick={() => removeLink(l)}
                aria-label="remove link"
              >
                ×
              </button>
            </div>
          ))}

          {addingLink ? (
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault()
                void addLink()
              }}
            >
              <input
                type="text"
                placeholder="paste a url…"
                value={linkText}
                autoFocus
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => setLinkText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setAddingLink(false)
                }}
              />
              <button type="submit" className="btn-small">
                add
              </button>
            </form>
          ) : (
            <button className="btn-small btn-ghost" onClick={() => setAddingLink(true)}>
              ＋ link
            </button>
          )}
        </div>
      </div>

      {!isSub && (
        <div className="card">
          <h2>versions · {liveSubs.length}</h2>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault()
              void addSub()
            }}
          >
            <input
              type="text"
              placeholder="a version of this…"
              value={subText}
              onChange={(e) => setSubText(e.target.value)}
            />
            <button type="submit" className="btn-small btn-primary">
              add
            </button>
          </form>

          <div className="rows">
            {liveSubs.map((s) => (
              <IdeaRow key={s.id} idea={s} sub />
            ))}
          </div>

          {boughtSubs.length > 0 && (
            <details className="bought-block inline">
              <summary>bought · {boughtSubs.length}</summary>
              <div className="rows">
                {boughtSubs.map((s) => (
                  <IdeaRow key={s.id} idea={s} sub />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
