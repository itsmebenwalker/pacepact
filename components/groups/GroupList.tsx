'use client'

import { useState } from 'react'
import Link from 'next/link'
import GroupCard from './GroupCard'
import type { Group } from '@/types'

type GroupWithPoints = Group & { my_points: number }

const SEARCH_THRESHOLD = 5

export default function GroupList({ groups }: { groups: GroupWithPoints[] }) {
  const [query, setQuery] = useState('')

  const showSearch = groups.length > SEARCH_THRESHOLD
  const q = query.trim().toLowerCase()
  const filtered = showSearch && q
    ? groups.filter((g) =>
        g.name.toLowerCase().includes(q) ||
        g.event_name.toLowerCase().includes(q)
      )
    : groups

  return (
    <>
      {showSearch && (
        <div className="relative mb-4">
          <input
            type="search"
            placeholder="Search groups…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
          />
        </div>
      )}

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {filtered.map((group) => (
          <GroupCard key={group.id} group={group} myPoints={group.my_points} />
        ))}
        {filtered.length === 0 && q && (
          <p className="col-span-full text-sm text-zinc-400 dark:text-zinc-500 text-center py-8">
            No groups match &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      <Link
        href="/group/new"
        className="sm:hidden mt-3 block w-full text-center py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
      >
        New group
      </Link>
    </>
  )
}
