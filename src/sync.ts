// Encrypted multi-device sync via a private GitHub gist — Bounty's own gist,
// never shared storage with Anchor or Helm.
// Strategy: pull remote snapshot → merge per-record (last-write-wins on
// updatedAt, tombstones carry deletions) → write merged locally → push.

import { db, TABLES, type BaseRec, type TableName } from './db'
import { encryptJSON, decryptJSON } from './crypto'
import { getSetting, setSetting, syncConfigured } from './settings'

const FILE_NAME = 'bounty-data.enc.json'
const API = 'https://api.github.com'

export type Snapshot = Record<TableName, BaseRec[]>

function ghHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export async function localSnapshot(): Promise<Snapshot> {
  const out = {} as Snapshot
  for (const t of TABLES) {
    out[t] = (await db.table(t).toArray()) as BaseRec[]
  }
  return out
}

export function mergeSnapshots(a: Snapshot, b: Snapshot): Snapshot {
  const out = {} as Snapshot
  for (const t of TABLES) {
    const byId = new Map<string, BaseRec>()
    for (const rec of a[t] ?? []) byId.set(rec.id, rec)
    for (const rec of b[t] ?? []) {
      const existing = byId.get(rec.id)
      if (!existing || rec.updatedAt > existing.updatedAt) byId.set(rec.id, rec)
    }
    out[t] = [...byId.values()]
  }
  return out
}

async function writeSnapshot(snap: Snapshot) {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).bulkPut(snap[t] ?? [])
    }
  })
}

async function pullGist(token: string, gistId: string): Promise<string | null> {
  const res = await fetch(`${API}/gists/${gistId}`, { headers: ghHeaders(token) })
  if (res.status === 404) throw new Error('Sync gist not found — check the gist ID in Settings.')
  if (!res.ok) throw new Error(`GitHub error ${res.status} while pulling.`)
  const gist = await res.json()
  const file = gist.files?.[FILE_NAME]
  if (!file) return null
  if (file.truncated) {
    const raw = await fetch(file.raw_url)
    if (!raw.ok) throw new Error('Failed to download sync data.')
    return raw.text()
  }
  return file.content as string
}

async function pushGist(token: string, gistId: string, content: string) {
  const res = await fetch(`${API}/gists/${gistId}`, {
    method: 'PATCH',
    headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: { [FILE_NAME]: { content } } }),
  })
  if (!res.ok) throw new Error(`GitHub error ${res.status} while pushing.`)
}

/**
 * Find an existing Bounty gist on this account.
 *
 * Without this, a second device that has the token and passphrase but no gist
 * ID silently creates its OWN gist, and the two devices drift apart with no
 * error to tell you — which is how this account ended up with three Anchor
 * gists. Discovery is best-effort: if the lookup fails we fall through to
 * creating one, which is the old behaviour.
 */
async function findGist(token: string): Promise<string | null> {
  try {
    const res = await fetch(`${API}/gists?per_page=100`, { headers: ghHeaders(token) })
    if (!res.ok) return null
    const gists = (await res.json()) as Array<{
      id: string
      files: Record<string, unknown> | null
      updated_at: string
    }>
    const mine = gists
      .filter((g) => g.files && FILE_NAME in g.files)
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    return mine[0]?.id ?? null
  } catch {
    return null
  }
}

async function createGist(token: string, content: string): Promise<string> {
  const res = await fetch(`${API}/gists`, {
    method: 'POST',
    headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Bounty — encrypted gift-stash sync (private)',
      public: false,
      files: { [FILE_NAME]: { content } },
    }),
  })
  if (res.status === 401) throw new Error('GitHub token was rejected — check it has the "gist" scope.')
  if (!res.ok) throw new Error(`GitHub error ${res.status} while creating the sync gist.`)
  const gist = await res.json()
  return gist.id as string
}

// ---------- auto-sync ----------
// Any local write schedules a debounced background sync, so edits reach the
// gist without the user ever pressing the sync button. `suppress` prevents
// sync's own bulkPut writes from re-triggering a sync loop.

let syncTimer: ReturnType<typeof setTimeout> | undefined
let suppress = false

export function scheduleAutoSync(onDone?: () => void) {
  if (suppress || !syncConfigured()) return
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = undefined
    syncNow()
      .then(() => onDone?.())
      .catch(() => {}) // offline or transient — next change or app-open retries
  }, 4000)
}

let autoSyncStarted = false
export function initAutoSync(onDone?: () => void) {
  if (autoSyncStarted) return
  autoSyncStarted = true
  for (const t of TABLES) {
    const table = db.table(t)
    table.hook('creating', () => {
      scheduleAutoSync(onDone)
    })
    table.hook('updating', () => {
      scheduleAutoSync(onDone)
    })
    table.hook('deleting', () => {
      scheduleAutoSync(onDone)
    })
  }
  // flush a pending sync immediately when the app is backgrounded/closed
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && syncTimer !== undefined) {
      clearTimeout(syncTimer)
      syncTimer = undefined
      syncNow()
        .then(() => onDone?.())
        .catch(() => {})
    }
  })
}

/** Merge an imported plain-JSON snapshot into the local database. */
export async function importData(snap: Snapshot) {
  const merged = mergeSnapshots(await localSnapshot(), snap)
  await writeSnapshot(merged)
}

/** Full sync cycle. Returns a short human-readable status. */
export async function syncNow(): Promise<string> {
  const token = getSetting('ghToken')
  const passphrase = getSetting('passphrase')
  if (!token || !passphrase) {
    throw new Error('set up sync in settings first (github token + passphrase).')
  }

  suppress = true
  try {
    let snap = await localSnapshot()
    let gistId = getSetting('gistId')

    // a device with no gist ID joins the existing stash rather than forking it
    if (!gistId) {
      const found = await findGist(token)
      if (found) {
        gistId = found
        setSetting('gistId', found)
      }
    }

    if (gistId) {
      const remoteRaw = await pullGist(token, gistId)
      if (remoteRaw) {
        const remote = await decryptJSON<Snapshot>(remoteRaw, passphrase)
        snap = mergeSnapshots(snap, remote)
        await writeSnapshot(snap)
      }
      await pushGist(token, gistId, await encryptJSON(snap, passphrase))
    } else {
      const id = await createGist(token, await encryptJSON(snap, passphrase))
      setSetting('gistId', id)
    }

    setSetting('lastSyncAt', String(Date.now()))
    return 'synced'
  } finally {
    suppress = false
  }
}
