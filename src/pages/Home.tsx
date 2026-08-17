import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, alive, newRec, patch, type Idea, type Person } from '../db'

/** Capture-first: type an idea, tap a name, done. Two taps, no detail required. */
function Capture({ people }: { people: Person[] }) {
  const [text, setText] = useState('')
  const [flash, setFlash] = useState('')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function capture(person: Person) {
    const title = text.trim()
    if (!title) {
      inputRef.current?.focus()
      return
    }
    await db.ideas.add({
      ...newRec(),
      personId: person.id,
      title,
      notes: '',
      links: [],
      price: '',
      bought: 0,
    })
    setText('')
    setFlash(`✓ ${person.name}`)
    setTimeout(() => setFlash(''), 2000)
    inputRef.current?.focus()
  }

  async function addPerson() {
    const name = newName.trim()
    if (!name) return
    const order = people.length ? Math.max(...people.map((p) => p.order)) + 1 : 0
    await db.people.add({ ...newRec(), name, notes: '', order })
    setNewName('')
    setAdding(false)
  }

  return (
    <div className="card">
      <h2>
        capture
        {flash && <span className="flash"> · {flash}</span>}
      </h2>

      <input
        ref={inputRef}
        type="text"
        placeholder="an idea…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        enterKeyHint="done"
      />

      <div className="chips">
        {people.map((p) => (
          <button key={p.id} className={`btn-small ${text.trim() ? 'btn-primary' : ''}`} onClick={() => capture(p)}>
            {p.name}
          </button>
        ))}
        {!adding && (
          <button className="btn-small btn-ghost" onClick={() => setAdding(true)}>
            ＋ person
          </button>
        )}
      </div>

      {adding && (
        <form
          className="row add-person"
          onSubmit={(e) => {
            e.preventDefault()
            void addPerson()
          }}
        >
          <input
            type="text"
            placeholder="who?"
            value={newName}
            autoFocus
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setAdding(false)
            }}
          />
          <button type="submit" className="btn-small">
            add
          </button>
          <button type="button" className="btn-small btn-ghost" onClick={() => setAdding(false)}>
            ×
          </button>
        </form>
      )}

      {people.length === 0 && <p className="muted small">no one here yet.</p>}
    </div>
  )
}

interface Hit {
  kind: 'person' | 'idea'
  id: string
  label: string
  context: string
  to: string
}

/** Instant, in-memory search across people, ideas and sub-ideas. No network. */
function search(q: string, people: Person[], ideas: Idea[]): Hit[] {
  const needle = q.toLowerCase()
  const nameOf = new Map(people.map((p) => [p.id, p.name]))
  const titleOf = new Map(ideas.map((i) => [i.id, i.title]))

  const hits: Hit[] = []

  for (const p of people) {
    if (p.name.toLowerCase().includes(needle) || p.notes.toLowerCase().includes(needle)) {
      hits.push({ kind: 'person', id: p.id, label: p.name, context: 'person', to: `/p/${p.id}` })
    }
  }

  for (const i of ideas) {
    if (!i.title.toLowerCase().includes(needle) && !i.notes.toLowerCase().includes(needle)) continue
    const person = nameOf.get(i.personId) ?? '—'
    const parent = i.parentId ? titleOf.get(i.parentId) : undefined
    hits.push({
      kind: 'idea',
      id: i.id,
      label: i.title,
      context: [person, parent, i.bought ? 'bought' : null].filter(Boolean).join(' · '),
      to: `/p/${i.personId}/i/${i.id}`,
    })
  }

  return hits
}

export default function Home() {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)

  // keep the live-query results themselves in the deps — defaulting with `?? []`
  // inline would mint a new array every render and defeat every memo below
  const peopleRaw = useLiveQuery(async () => (await db.people.toArray()).filter(alive))
  const ideasRaw = useLiveQuery(async () => (await db.ideas.toArray()).filter(alive))
  const people = useMemo(() => peopleRaw ?? [], [peopleRaw])
  const ideas = useMemo(() => ideasRaw ?? [], [ideasRaw])

  const ordered = useMemo(
    () => [...people].sort((a, b) => a.order - b.order || a.createdAt - b.createdAt),
    [people],
  )

  /** live count = top-level ideas still on the list; candidates nested under
      a category aren't counted twice */
  const liveCount = (personId: string) =>
    ideas.filter((i) => i.personId === personId && !i.parentId && !i.bought).length

  const hits = useMemo(
    () => (query.trim() ? search(query.trim(), people, ideas) : []),
    [query, people, ideas],
  )

  async function move(index: number, delta: number) {
    const a = ordered[index]
    const b = ordered[index + delta]
    if (!a || !b) return
    await patch(db.people, a.id, { order: b.order })
    await patch(db.people, b.id, { order: a.order })
  }

  return (
    <div>
      <Capture people={ordered} />

      <div className="card">
        <h2 className="row-between">
          <span>
            {searching ? 'search' : `people · ${ordered.length}`}
          </span>
          <button
            className="btn-small btn-ghost"
            onClick={() => {
              setSearching(!searching)
              setQuery('')
            }}
            aria-label="search"
            title="search everything"
          >
            {searching ? '×' : '⌕'}
          </button>
        </h2>

        {searching ? (
          <>
            <input
              type="text"
              placeholder="people, ideas, notes…"
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearching(false)
                  setQuery('')
                }
              }}
            />
            <div className="hits">
              {hits.map((h) => (
                <Link key={`${h.kind}-${h.id}`} to={h.to} className="hit">
                  <span className="hit-label">{h.label}</span>
                  <span className="meta">{h.context}</span>
                </Link>
              ))}
              {query.trim() && hits.length === 0 && (
                <p className="muted small">nothing matches “{query.trim()}”.</p>
              )}
            </div>
          </>
        ) : (
          <>
            {ordered.map((p, idx) => (
              <div key={p.id} className="person-row">
                <span className={`dot ${liveCount(p.id) ? '' : 'off'}`} />
                <Link to={`/p/${p.id}`} className="person-name">
                  {p.name}
                </Link>
                <span className="meta">{liveCount(p.id)}</span>
                <button
                  className="btn-small btn-ghost"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  aria-label="move up"
                >
                  ↑
                </button>
                <button
                  className="btn-small btn-ghost"
                  onClick={() => move(idx, 1)}
                  disabled={idx === ordered.length - 1}
                  aria-label="move down"
                >
                  ↓
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
