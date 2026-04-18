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
  const [chatOpen, setChatOpen] = useState(false)
  const desktopBottomRef = useRef<HTMLDivElement>(null)
  const mobileBottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  function scrollToBottom(behavior?: ScrollBehavior) {
    desktopBottomRef.current?.scrollIntoView(behavior ? { behavior } : undefined)
    mobileBottomRef.current?.scrollIntoView(behavior ? { behavior } : undefined)
  }

  useEffect(() => { scrollToBottom() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (chatOpen) scrollToBottom()
  }, [chatOpen]) // eslint-disable-line react-hooks/exhaustive-deps

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
          scrollToBottom('smooth')
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
      scrollToBottom('smooth')
    }

    setSending(false)
  }

  function MessageList({ bottomRef }: { bottomRef: React.RefObject<HTMLDivElement> }) {
    return (
      <>
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
      </>
    )
  }

  function ChatForm() {
    return (
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
    )
  }

  const unreadCount = 0 // future: track unread since sheet last opened

  return (
    <>
      {/* Desktop chat box */}
      <div className="hidden sm:block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Group chat</h2>
        </div>
        <div className="h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
          <MessageList bottomRef={desktopBottomRef} />
        </div>
        <ChatForm />
      </div>

      {/* Mobile floating pill */}
      <button
        onClick={() => setChatOpen(true)}
        className="sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-medium rounded-full shadow-lg transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-200"
        style={{ zIndex: 40 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Group chat
        {unreadCount > 0 && (
          <span className="flex items-center justify-center w-4 h-4 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-[10px] font-bold rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Mobile chat sheet */}
      {chatOpen && (
        <div
          className="fixed inset-0 z-50 sm:hidden"
          onClick={() => setChatOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 inset-x-0 bg-white dark:bg-zinc-900 rounded-t-2xl flex flex-col"
            style={{ height: '70%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="w-10 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto" />
            </div>
            <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Group chat</h2>
              <button
                onClick={() => setChatOpen(false)}
                className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                aria-label="Close chat"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
              <MessageList bottomRef={mobileBottomRef} />
            </div>
            <div className="shrink-0">
              <ChatForm />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
