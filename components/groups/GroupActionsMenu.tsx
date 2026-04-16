'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Props {
  groupId: string
  groupName: string
  eventName: string
  inviteCode: string
  inviteLocked: boolean
  isCreator: boolean
}

type Modal = 'rotate' | 'edit' | 'delete' | 'leave' | null

export default function GroupActionsMenu({
  groupId,
  groupName,
  eventName,
  inviteCode,
  inviteLocked,
  isCreator,
}: Props) {
  const router = useRouter()

  // Dropdown state
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Which confirm/edit modal is showing
  const [modal, setModal] = useState<Modal>(null)

  // Shared async state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Copy-invite feedback
  const [copied, setCopied] = useState(false)

  // Edit modal field state
  const [editName, setEditName] = useState(groupName)
  const [editEventName, setEditEventName] = useState(eventName)

  // Delete modal confirmation input
  const [deleteInput, setDeleteInput] = useState('')

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function openModal(m: Modal) {
    setOpen(false)
    setError(null)
    if (m === 'edit') {
      setEditName(groupName)
      setEditEventName(eventName)
    }
    if (m === 'delete') setDeleteInput('')
    setModal(m)
  }

  function closeModal() {
    if (loading) return
    setModal(null)
    setError(null)
  }

  async function copyInvite() {
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/join/${inviteCode}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setOpen(false)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleToggleLock() {
    setOpen(false)
    setLoading(true)
    const res = await fetch(`/api/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_invite_lock' }),
    })
    setLoading(false)
    if (res.ok) router.refresh()
  }

  async function handleRotate() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rotate_invite' }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }
    setModal(null)
    setLoading(false)
    router.refresh()
  }

  async function handleEdit() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, event_name: editEventName }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }
    setModal(null)
    setLoading(false)
    router.refresh()
  }

  async function handleDelete() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  async function handleLeave() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/groups/${groupId}/members/me`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  // ── Shared styles ────────────────────────────────────────────────────────────

  const itemBase =
    'w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2'
  const itemDefault = `${itemBase} text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800`
  const itemDestructive = `${itemBase} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950`
  const inputClass =
    'w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent transition-colors'
  const labelClass = 'block text-sm text-zinc-700 dark:text-zinc-300 mb-1.5'
  const cancelBtn =
    'flex-1 text-sm border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium py-2 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40'
  const primaryBtn =
    'flex-1 text-sm bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-40 text-white dark:text-zinc-900 font-medium py-2 rounded-md transition-colors'
  const destructiveBtn =
    'flex-1 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-medium py-2 rounded-md transition-colors'

  return (
    <>
      {/* ── Trigger ──────────────────────────────────────────────────────────── */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Group actions"
          className={`flex items-center gap-1.5 text-sm border px-3 py-1.5 rounded-md transition-colors ${
            copied
              ? 'border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950'
              : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
          }`}
        >
          {copied ? 'Copied!' : '•••'}
        </button>

        {/* ── Dropdown ─────────────────────────────────────────────────────── */}
        {open && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg overflow-hidden z-40">
            <Link href={`/groups/${groupId}/members`} className={itemDefault}>
              Members
            </Link>
            <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />
            <button onClick={copyInvite} className={itemDefault}>
              Copy invite link
            </button>

            {isCreator && (
              <>
                <button onClick={() => openModal('rotate')} className={itemDefault}>
                  Reset invite link
                </button>
                <button
                  onClick={handleToggleLock}
                  disabled={loading}
                  className={itemDefault}
                >
                  {inviteLocked ? 'Unlock invites' : 'Lock invites'}
                </button>
                <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />
                <button onClick={() => openModal('edit')} className={itemDefault}>
                  Edit group
                </button>
                <button onClick={() => openModal('delete')} className={itemDestructive}>
                  Delete group
                </button>
              </>
            )}

            {!isCreator && (
              <>
                <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />
                <button onClick={() => openModal('leave')} className={itemDestructive}>
                  Leave group
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={closeModal} />

          <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg w-full max-w-sm p-6 space-y-4">

            {/* Reset invite link */}
            {modal === 'rotate' && (
              <>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Reset invite link</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  This generates a new invite link. The old link will stop working immediately.
                </p>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <div className="flex gap-3 pt-1">
                  <button onClick={closeModal} disabled={loading} className={cancelBtn}>Cancel</button>
                  <button onClick={handleRotate} disabled={loading} className={primaryBtn}>
                    {loading ? 'Resetting...' : 'Reset link'}
                  </button>
                </div>
              </>
            )}

            {/* Edit group */}
            {modal === 'edit' && (
              <>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Edit group</h2>
                <div>
                  <label className={labelClass}>Group name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Event name</label>
                  <input
                    type="text"
                    value={editEventName}
                    onChange={(e) => setEditEventName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <div className="flex gap-3 pt-1">
                  <button onClick={closeModal} disabled={loading} className={cancelBtn}>Cancel</button>
                  <button
                    onClick={handleEdit}
                    disabled={
                      loading ||
                      !editName.trim() ||
                      !editEventName.trim() ||
                      (editName.trim() === groupName && editEventName.trim() === eventName)
                    }
                    className={primaryBtn}
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            )}

            {/* Delete group */}
            {modal === 'delete' && (
              <>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Delete group</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  This will permanently delete the group, training plan, and message history for every member. This cannot be undone.
                </p>
                <div className="space-y-1.5">
                  <label className="text-sm text-zinc-700 dark:text-zinc-300">
                    Type <span className="font-medium text-zinc-900 dark:text-zinc-50">{eventName}</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder={eventName}
                    autoFocus
                    className={inputClass}
                  />
                </div>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <div className="flex gap-3 pt-1">
                  <button onClick={closeModal} disabled={loading} className={cancelBtn}>Cancel</button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteInput !== eventName || loading}
                    className={destructiveBtn}
                  >
                    {loading ? 'Deleting...' : 'Delete group'}
                  </button>
                </div>
              </>
            )}

            {/* Leave group */}
            {modal === 'leave' && (
              <>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Leave group</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Leave{' '}
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{groupName}</span>?
                  Your training history and points will be removed. You can rejoin later with an invite link.
                </p>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <div className="flex gap-3 pt-1">
                  <button onClick={closeModal} disabled={loading} className={cancelBtn}>Cancel</button>
                  <button onClick={handleLeave} disabled={loading} className={primaryBtn}>
                    {loading ? 'Leaving...' : 'Leave group'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  )
}
