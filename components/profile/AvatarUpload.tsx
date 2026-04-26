'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  initialAvatarUrl: string | null
  displayName: string | null
}

export default function AvatarUpload({ userId, initialAvatarUrl, displayName }: Props) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.')
      return
    }

    setUploading(true)
    setError(null)

    const supabase = createClient()
    const path = `${userId}/avatar`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      setError('Upload failed. Please try again.')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const urlWithBust = `${publicUrl}?t=${Date.now()}`

    const res = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: urlWithBust }),
    })

    if (!res.ok) {
      setError('Failed to save. Please try again.')
      setUploading(false)
      return
    }

    setAvatarUrl(urlWithBust)
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => !uploading && inputRef.current?.click()}
        className="relative group block w-10 h-10 rounded-full shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
        aria-label="Change profile picture"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName ?? 'Profile photo'}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {displayName?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
        )}

        <div className={`absolute inset-0 rounded-full bg-black/50 flex items-center justify-center transition-opacity ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {uploading ? (
            <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1 w-max">{error}</p>
      )}
    </div>
  )
}
