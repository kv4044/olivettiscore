'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Calendar, Check, ChevronDown, Trophy } from 'lucide-react'

export interface TeamCompetitionOption {
  id: number
  name: string
  country?: string
}

export interface TeamSeasonOption {
  id: number
  name: string
  year?: number
  is_current?: boolean
}

interface TeamStandingsSelectorProps {
  competitions: TeamCompetitionOption[]
  seasons: TeamSeasonOption[]
  selectedLeagueId: number | null
  selectedSeasonId: number | null
}

export default function TeamStandingsSelector({
  competitions,
  seasons,
  selectedLeagueId,
  selectedSeasonId
}: TeamStandingsSelectorProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const selectedCompetition = competitions.find((competition) => competition.id === selectedLeagueId)

  const pushSelection = (leagueId: number, seasonId?: number | null) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('competicao', String(leagueId))

    if (seasonId) {
      params.set('epoca', String(seasonId))
    } else {
      params.delete('epoca')
    }

    router.push(`${pathname}?${params.toString()}`)
  }

  const handleSeasonChange = (seasonId: number | null) => {
    const leagueId = selectedLeagueId || competitions[0]?.id
    if (!leagueId) return
    pushSelection(leagueId, seasonId)
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 px-3.5 py-3 text-left transition-all hover:border-indigo-500/40 hover:bg-zinc-950"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Trophy className="h-4 w-4 shrink-0 text-amber-400" />
            <span className="min-w-0">
              <span className="block truncate text-xs font-black text-zinc-200">
                {selectedCompetition?.name || 'Escolher competição'}
              </span>
              <span className="block truncate text-[10px] font-bold text-zinc-500">
                {selectedCompetition?.country || `${competitions.length} competições encontradas`}
              </span>
            </span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl">
            {competitions.map((competition) => {
              const selected = competition.id === selectedLeagueId
              return (
                <button
                  key={competition.id}
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    pushSelection(competition.id)
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    selected ? 'bg-indigo-500/15 text-indigo-200' : 'text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-100'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-black">{competition.name}</span>
                    {competition.country && (
                      <span className="block truncate text-[10px] font-bold text-zinc-500">{competition.country}</span>
                    )}
                  </span>
                  {selected && <Check className="h-3.5 w-3.5 shrink-0 text-indigo-300" />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 rounded-2xl border border-zinc-850 bg-zinc-950/30 px-3 py-2">
        <Calendar className="h-4 w-4 shrink-0 text-purple-400" />
        <select
          value={selectedSeasonId || ''}
          onChange={(event) => handleSeasonChange(Number(event.target.value) || null)}
          disabled={!selectedLeagueId || seasons.length === 0}
          className="min-w-0 flex-1 bg-transparent text-xs font-black text-zinc-200 outline-none disabled:text-zinc-600"
        >
          {seasons.length === 0 ? (
            <option value="">Sem épocas disponíveis</option>
          ) : (
            seasons.map((season) => (
              <option key={season.id} value={season.id} className="bg-zinc-950 text-zinc-100">
                {season.name}{season.is_current ? ' · Atual' : ''}
              </option>
            ))
          )}
        </select>
      </label>
    </div>
  )
}
