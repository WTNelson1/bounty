import Dexie, { type Table } from 'dexie'

export interface BaseRec {
  id: string
  createdAt: number
  updatedAt: number
  /** tombstone timestamp — deleted records are kept so deletions sync across devices */
  deleted?: number
}

/** People are lightweight containers: a name and whatever you need to remember. */
export interface Person extends BaseRec {
  name: string
  /** sizes, tastes, "hates scented things" — free text, always optional */
  notes: string
  /** manual order; the ↑↓ controls swap this with a neighbour so the
      heavily-trafficked few sit at the top */
  order: number
}

/**
 * An idea. Everything but the title is optional — capture must never require
 * details. Ideas nest exactly one level: a category ("wireless headphones")
 * with candidate versions under it, each a full idea in its own right.
 */
export interface Idea extends BaseRec {
  personId: string
  /** set on sub-ideas: the id of the parent idea. One level only. */
  parentId?: string
  title: string
  notes: string
  links: string[]
  /** free text, not a number — "$40-ish" and "£25" must both capture */
  price: string
  /** the one status. bought ideas drop into the collapsed history under a person. */
  bought: 0 | 1
  boughtAt?: number
}

class BountyDB extends Dexie {
  people!: Table<Person, string>
  ideas!: Table<Idea, string>

  constructor() {
    super('bounty')
    this.version(1).stores({
      people: 'id, order, updatedAt',
      ideas: 'id, personId, parentId, bought, updatedAt',
    })
  }
}

export const db = new BountyDB()

export const TABLES = ['people', 'ideas'] as const
export type TableName = (typeof TABLES)[number]

export function newRec(): BaseRec {
  const now = Date.now()
  return { id: crypto.randomUUID(), createdAt: now, updatedAt: now }
}

export function alive<T extends BaseRec>(r: T): boolean {
  return !r.deleted
}

export async function patch<T extends BaseRec>(
  table: Table<T, string>,
  id: string,
  changes: Partial<T>,
) {
  await table.update(id, (obj: T) => {
    Object.assign(obj, changes, { updatedAt: Date.now() })
  })
}

export async function softDelete<T extends BaseRec>(table: Table<T, string>, id: string) {
  const now = Date.now()
  await table.update(id, (obj: T) => {
    Object.assign(obj, { deleted: now, updatedAt: now })
  })
}

/** Deleting a person or a parent idea takes its children with it. */
export async function deleteIdeaTree(ideaId: string) {
  const subs = await db.ideas.where('parentId').equals(ideaId).toArray()
  for (const s of subs) await softDelete(db.ideas, s.id)
  await softDelete(db.ideas, ideaId)
}

export async function deletePerson(personId: string) {
  const ideas = await db.ideas.where('personId').equals(personId).toArray()
  for (const i of ideas) await softDelete(db.ideas, i.id)
  await softDelete(db.people, personId)
}

/** Links are stored as typed; normalise just enough that an <a href> works. */
export function normaliseUrl(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}

/** Display form for a link: the host, without the www. */
export function linkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
