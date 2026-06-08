'use client'

import { useState, useEffect } from 'react'
import { Trophy, Search, X, Loader2 } from 'lucide-react'

interface ProfileRow {
  id?: string
  email: string
  points: number
  first_name?: string | null
  last_name?: string | null
  username?: string | null
  rank?: number
}

interface LeaderboardSectionProps {
  initialLeaderboard: ProfileRow[]
  currentUserId: string
}

export default function LeaderboardSection({
  initialLeaderboard,
  currentUserId
}: LeaderboardSectionProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProfileRow[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Masking helper
  const getUsername = (email: string): string => {
    // If the email is already masked (like sim***@gmail.com), get the part before '@'
    const [local] = email.split('@')
    if (!local) return 'utilizador'
    if (local.includes('***')) return local
    
    if (local.length <= 3) {
      return `${local.substring(0, 1)}***`
    }
    return `${local.substring(0, 3)}***`
  }

  const getDisplayName = (row: ProfileRow) => {
    return row.username || getUsername(row.email)
  }

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setIsLoading(false)
      return
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          // Search results return: { players: [{ id, email, name, points, rank }] }
          const mappedPlayers = (data.players || []).map((player: any) => ({
            id: player.id,
            email: player.email, // already masked email
            points: player.points,
            first_name: player.name, // contains full name if set, else masked email
            last_name: '',
            rank: player.rank
          }))
          setResults(mappedPlayers)
        }
      } catch (err) {
        console.error('Error searching players:', err)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [query])

  const displayList = query.trim().length >= 2 ? results : initialLeaderboard

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-400" />
        <span>Classificação Geral</span>
      </h3>

      <div className="backdrop-blur-xl bg-zinc-900/20 border border-zinc-800/60 rounded-3xl overflow-hidden shadow-lg flex flex-col">
        {/* Search input with magnifying glass */}
        <div className="p-3 border-b border-zinc-900 bg-zinc-950/20 relative flex items-center">
          <Search className="absolute left-6 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar utilizador..."
            className="w-full h-9 pl-9 pr-8 rounded-xl border border-zinc-800 bg-zinc-950/40 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition-all font-semibold text-xs"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-6 p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Leaderboard content */}
        {isLoading ? (
          <div className="py-12 text-center text-zinc-500 space-y-2">
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin mx-auto" />
            <p className="text-xxs">A pesquisar utilizadores...</p>
          </div>
        ) : displayList.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-xs">
            Sem utilizadores encontrados.
          </div>
        ) : (
          <div className="divide-y divide-zinc-900/60">
            {displayList.map((profileRow, index) => {
              const rank = profileRow.rank || (index + 1)
              const isOwnProfile = profileRow.id === currentUserId

              // Podium colors
              let rankBadge = 'text-zinc-400 bg-zinc-950 border-zinc-850'
              if (rank === 1) rankBadge = 'text-amber-400 bg-amber-500/10 border-amber-500/20 font-black'
              if (rank === 2) rankBadge = 'text-zinc-300 bg-zinc-300/10 border-zinc-300/20 font-black'
              if (rank === 3) rankBadge = 'text-amber-600 bg-amber-600/10 border-amber-600/20 font-black'

              return (
                <div
                  key={profileRow.id || index}
                  className={`flex items-center justify-between p-3.5 px-4 gap-4 transition-colors ${
                    isOwnProfile ? 'bg-indigo-500/5 border-l-2 border-indigo-500 pl-3.5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Rank Circle */}
                    <div className={`w-6 h-6 rounded-lg border flex items-center justify-center text-xxs font-mono ${rankBadge}`}>
                      {rank}
                    </div>

                    {/* Display Name / Username */}
                    <span className={`text-xs font-semibold ${isOwnProfile ? 'text-indigo-300 font-extrabold' : 'text-zinc-300'}`}>
                      {getDisplayName(profileRow)} {isOwnProfile && '(Eu)'}
                    </span>
                  </div>

                  {/* Points */}
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-black ${isOwnProfile ? 'text-indigo-400' : 'text-zinc-200'}`}>
                      {profileRow.points}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-600 uppercase">PTS</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
