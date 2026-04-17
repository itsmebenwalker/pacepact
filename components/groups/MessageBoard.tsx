'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatMessageTime } from '@/lib/utils/format-time'

interface MessageRow {
  id: string
  user_id: string
  content: string
  created_at: string
  display_name: string | null
}

interface Props {
  groupId: string
  currentUserId: string
  initialMessages: MessageRow[]
  memberNames: Record<string, string | null>
  memberAvatars: Record<string, string | null>
}

export default function MessageBoard({
  groupId,
  currentUserId,
  initialMessages,
  memberNames,
  memberAvatars,
}: Props) {
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Scroll to bottom on initial mount
  useEffect(() => {
    bottomRef.current?.scrollIntoView()
  }, [])

  // Realtime: new messages from other members
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const row = payload.new as { id: string; user_id: string; content: string; created_at: string }
          setMessages((prev) => {
            // Deduplicate — our own messages are added optimistically on send
            if (prev.some((m) => m.id === row.id)) return prev
            return [
              ...prev,
              {
                id: row.id,
                user_id: row.user_id,
                content: row.content,
                created_at: row.created_at,
                display_name: memberNames[row.user_id] ?? null,
              },
            ]
          })
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [groupId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed || sending) return

    setSending(true)
    setContent('')

    const { data, error } = await supabase
      .from('messages')
      .insert({ group_id: groupId, user_id: currentUserId, content: trimmed })
      .select('id, user_id, content, created_at')
      .single()

    if (!error && data) {
      setMessages((prev) => [
        ...prev,
        { ...data, display_name: memberNames[currentUserId] ?? null },
      ])
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    setSending(false)
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Group chat</h2>
      </div>

      <div className="h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
        {messages.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">
            No messages yet — say hello!
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`px-4 py-3 sm:px-5 flex gap-3 ${
                msg.user_id === currentUserId ? 'bg-zinc-50 dark:bg-zinc-800/40' : ''
              }`}
            >
              {memberAvatars[msg.user_id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={memberAvatars[msg.user_id]!}
                  alt={msg.display_name ?? 'Athlete'}
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {(msg.display_name ?? 'A')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
                    {msg.display_name ?? 'Athlete'}
                    {msg.user_id === currentUserId && (
                      <span className="ml-1.5 font-normal text-zinc-400 dark:text-zinc-500">you</span>
                    )}
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
                    {formatMessageTime(msg.created_at)}
                  </span>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-snug break-words">
                  {msg.content}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="p-3 sm:p-4 border-t border-zinc-100 dark:border-zinc-800 flex gap-2"
      >
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a message…"
          maxLength={200}
          className="flex-1 px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent transition-colors"
        />
        <button
          type="submit"
          disabled={!content.trim() || sending}
          className="px-3 py-2 bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-40 text-white dark:text-zinc-900 font-medium rounded-md text-sm transition-colors shrink-0"
        >
          Send
        </button>
      </form>
    </div>
  )
}
