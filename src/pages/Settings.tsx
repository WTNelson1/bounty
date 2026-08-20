import { useEffect, useRef, useState } from 'react'
import { db, TABLES } from '../db'
import { getSetting, setSetting, type SettingKey } from '../settings'
import { localSnapshot, importData, syncNow, type Snapshot } from '../sync'

function SettingInput({
  settingKey,
  label,
  placeholder,
  password = false,
}: {
  settingKey: SettingKey
  label: string
  placeholder?: string
  password?: boolean
}) {
  const [value, setValue] = useState(getSetting(settingKey))
  const [show, setShow] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // macOS turns on Secure Event Input while a password field holds focus, and
  // the browser only turns it back off once focus leaves. Leave the window
  // with the cursor still sitting in the token or passphrase and it can stay
  // on system-wide, eating other apps' keystrokes. So let the field go the
  // moment the page stops being the thing you are looking at.
  useEffect(() => {
    if (!password) return
    const release = () => {
      if (inputRef.current && document.activeElement === inputRef.current) {
        inputRef.current.blur()
      }
    }
    const onVisibility = () => {
      if (document.hidden) release()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', release)
    // Fires on cmd-tab, when the window is still visible but no longer yours.
    window.addEventListener('blur', release)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', release)
      window.removeEventListener('blur', release)
      release() // and on unmount — leaving settings must not hold it either
    }
  }, [password])

  function commit(v: string) {
    setValue(v)
    setSetting(settingKey, v.trim())
  }

  return (
    <label className="field">
      <span className="label-text">{label}</span>
      <div className="row">
        <input
          ref={inputRef}
          type={password && !show ? 'password' : 'text'}
          placeholder={placeholder}
          value={value}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => commit(e.target.value)}
        />
        {password && (
          <button type="button" className="btn-small btn-ghost" onClick={() => setShow(!show)}>
            {show ? 'hide' : 'show'}
          </button>
        )}
      </div>
    </label>
  )
}

export default function Settings() {
  const [syncMsg, setSyncMsg] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [erasing, setErasing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const lastSync = getSetting('lastSyncAt')

  async function doSync() {
    setSyncMsg('syncing…')
    try {
      await syncNow()
      setSyncMsg('synced ✓')
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message.toLowerCase() : 'sync failed')
    }
  }

  async function exportJSON() {
    const snap = await localSnapshot()
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `bounty-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function importJSON(file: File) {
    try {
      const snap = JSON.parse(await file.text()) as Snapshot
      await importData(snap)
      setImportMsg('merged ✓')
    } catch {
      setImportMsg('couldn’t read that file — it should be a bounty json export.')
    }
    setTimeout(() => setImportMsg(''), 4000)
  }

  async function eraseLocal() {
    await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
      for (const t of TABLES) await db.table(t).clear()
    })
    localStorage.clear()
    location.reload()
  }

  return (
    <div>
      <p className="crumb">
        <a href="#/">← people</a>
      </p>

      <div className="card">
        <h2>sync across devices</h2>
        <SettingInput
          settingKey="ghToken"
          label="github token (gist scope)"
          placeholder="github_pat_… or ghp_…"
          password
        />
        <SettingInput
          settingKey="passphrase"
          label="sync passphrase (same on every device)"
          placeholder="a phrase only you know"
          password
        />
        <SettingInput
          settingKey="gistId"
          label="gist id (auto-filled on first sync; paste on the second device)"
        />
        <div className="row">
          <button className="btn-primary" onClick={doSync}>
            sync now
          </button>
          <span className="muted small">
            {syncMsg ||
              (lastSync
                ? `last synced ${new Date(Number(lastSync)).toLocaleString()}`
                : 'never synced')}
          </span>
        </div>
        <details className="help">
          <summary>how to set up sync</summary>
          <ol>
            <li>
              github → settings → developer settings → personal access tokens →{' '}
              <em>tokens (classic)</em> → generate. tick only the <code>gist</code> scope.
            </li>
            <li>
              pick a passphrase. your stash is encrypted with it <em>before</em> it leaves the
              device — github only ever stores ciphertext. lose the passphrase and the synced copy
              is unrecoverable.
            </li>
            <li>tap “sync now”. a private gist is created and its id appears above.</li>
            <li>on your other devices: same token, same passphrase, paste the same gist id.</li>
          </ol>
          <p className="muted small">
            bounty keeps its own gist · it never shares storage with anchor or helm.
          </p>
        </details>
      </div>

      <div className="card">
        <h2>your data</h2>
        <div className="row">
          <button onClick={exportJSON}>export json</button>
          <button onClick={() => fileRef.current?.click()}>import json</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void importJSON(f)
              e.target.value = ''
            }}
          />
          {importMsg && <span className="muted small">{importMsg}</span>}
        </div>
        <p className="muted small">
          everything lives in this browser · nothing leaves the device except through your own
          encrypted gist. no ai, no analytics, no sharing.
        </p>
        {erasing ? (
          <div className="row">
            <button className="btn-danger btn-small" onClick={eraseLocal}>
              sure? erase everything on this device
            </button>
            <button className="btn-small btn-ghost" onClick={() => setErasing(false)}>
              ×
            </button>
          </div>
        ) : (
          <button className="btn-small danger-hover" onClick={() => setErasing(true)}>
            erase all local data
          </button>
        )}
      </div>
    </div>
  )
}
