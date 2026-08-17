import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, alive, deletePerson, newRec, patch } from '../db'
import EditableText from '../components/EditableText'
import EditableNotes from '../components/EditableNotes'
import ConfirmDelete from '../components/ConfirmDelete'
import IdeaRow from '../components/IdeaRow'

export default function PersonPage() {
  const { personId = '' } = useParams()
  const navigate = useNavigate()
  const [text, setText] = useState('')

  const person = useLiveQuery(() => db.people.get(personId), [personId])
  const ideas =
    useLiveQuery(
      async () => (await db.ideas.where('personId').equals(personId).toArray()).filter(alive),
      [personId],
    ) ?? []

  if (!person || !alive(person)) {
    return (
      <div className="card">
        <p className="muted small">
          that person isn't here · <Link to="/">back to the list</Link>
        </p>
      </div>
    )
  }

  const tops = ideas.filter((i) => !i.parentId).sort((a, b) => b.createdAt - a.createdAt)
  const live = tops.filter((i) => !i.bought)
  const bought = tops
    .filter((i) => i.bought)
    .sort((a, b) => (b.boughtAt ?? b.updatedAt) - (a.boughtAt ?? a.updatedAt))
  const subCount = (id: string) => ideas.filter((i) => i.parentId === id && !i.bought).length

  async function add() {
    const title = text.trim()
    if (!title) return
    await db.ideas.add({
      ...newRec(),
      personId,
      title,
      notes: '',
      links: [],
      price: '',
      bought: 0,
    })
    setText('')
  }

  return (
    <div>
      <p className="crumb">
        <Link to="/">← people</Link>
      </p>

      <div className="card">
        <h2 className="row-between">
          <span>person</span>
          <ConfirmDelete
            title="delete person and everything under them"
            onConfirm={async () => {
              await deletePerson(personId)
              navigate('/')
            }}
          />
        </h2>
        <h3 className="entity-name">
          <EditableText value={person.name} onSave={(name) => patch(db.people, personId, { name })} />
        </h3>
        <EditableNotes
          value={person.notes}
          onSave={(notes) => patch(db.people, personId, { notes })}
          placeholder="＋ notes · sizes, tastes, what to avoid"
        />
      </div>

      <div className="card">
        <h2>ideas · {live.length}</h2>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
        >
          <input
            type="text"
            placeholder={`an idea for ${person.name}…`}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="btn-small btn-primary">
            add
          </button>
        </form>

        <div className="rows">
          {live.map((i) => (
            <IdeaRow key={i.id} idea={i} subCount={subCount(i.id)} />
          ))}
        </div>

        {live.length === 0 && <p className="muted small">nothing live.</p>}
      </div>

      {bought.length > 0 && (
        <details className="card bought-block">
          <summary>bought · {bought.length}</summary>
          <div className="rows">
            {bought.map((i) => (
              <IdeaRow key={i.id} idea={i} subCount={subCount(i.id)} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
