import { useEffect, useState } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import AppSwitcher from '@personal-os/kit/AppSwitcher'
import Home from './pages/Home'
import PersonPage from './pages/PersonPage'
import IdeaPage from './pages/IdeaPage'
import Settings from './pages/Settings'
import { initAutoSync, syncNow } from './sync'
import { syncConfigured } from './settings'

type SyncState = 'idle' | 'syncing' | 'ok' | 'error'

function SyncButton() {
  const [state, setState] = useState<SyncState>('idle')
  const [error, setError] = useState('')

  async function run(silent = false) {
    if (!syncConfigured()) {
      if (!silent) setError('set up sync in settings first.')
      return
    }
    setState('syncing')
    setError('')
    try {
      await syncNow()
      setState('ok')
      setTimeout(() => setState('idle'), 2500)
    } catch (e) {
      setState('error')
      if (!silent) setError(e instanceof Error ? e.message.toLowerCase() : 'sync failed')
    }
  }

  useEffect(() => {
    // pull the latest from other devices on app open, then push every local
    // change automatically (debounced) so nothing is lost between devices
    void run(true)
    initAutoSync(() => {
      setState('ok')
      setTimeout(() => setState('idle'), 2000)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const label = state === 'syncing' ? '…' : state === 'ok' ? '✓' : state === 'error' ? '✶' : '↻'
  return (
    <>
      <button
        className="btn-small btn-ghost"
        title="sync now"
        onClick={() => run()}
        disabled={state === 'syncing'}
        aria-label="Sync"
        style={state === 'error' ? { color: 'var(--danger)' } : undefined}
      >
        {label}
      </button>
      {error && <span className="error-text small">{error}</span>}
    </>
  )
}

// The suite. Each app's dot is its own accent — the palette is the wayfinding.
const APPS = [
  { name: 'helm', url: 'https://helm-blush.vercel.app', color: '#7ad6c0' },
  { name: 'anchor', url: 'https://wtnelson1.github.io/Session-Notes/', color: '#e8b64c' },
  { name: 'bounty', url: 'https://wtnelson1.github.io/bounty/', color: '#d08a5a' },
]

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        {/* The word goes home; the caret opens the suite. */}
        <h1>
          <Link to="/">bounty</Link>
          <AppSwitcher apps={APPS} current="bounty" label="" />
        </h1>
        <div className="header-actions">
          <SyncButton />
          <Link to="/settings" className="btn btn-small btn-ghost" aria-label="Settings">
            ⚙
          </Link>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/p/:personId" element={<PersonPage />} />
        <Route path="/p/:personId/i/:ideaId" element={<IdeaPage />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  )
}
