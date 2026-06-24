import Link from 'next/link'
import { CalendarDays, Crown, Minus } from 'lucide-react'
import type { BzzoiroEvent } from '@/services/bzzoiro'
import LocalTime from '@/components/LocalTime'

const KNOCKOUT_WORDS = [
  'final',
  'semi',
  'quarter',
  'quart',
  'oitav',
  'round of',
  'last 16',
  'last 32',
  'knockout',
  'playoff',
  'play-off',
  'elimin',
  'qualif',
  'prelim',
  '1/16',
  '1/8',
  '1/4',
  '1/2'
]

const NON_KNOCKOUT_WORDS = ['group', 'grupo', 'league', 'liga', 'regular']

function normalize(value: string | null | undefined) {
  return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function isKnockoutMatch(match: BzzoiroEvent) {
  const roundName = normalize(match.round_name)
  const groupName = normalize(match.group_name)

  if (groupName || NON_KNOCKOUT_WORDS.some((word) => roundName.includes(word))) {
    return false
  }

  return KNOCKOUT_WORDS.some((word) => roundName.includes(word))
}

export function getKnockoutMatches(matches: BzzoiroEvent[]) {
  const explicitKnockout = matches.filter(isKnockoutMatch)
  return explicitKnockout.length > 0 ? explicitKnockout : matches.filter((match) => !match.group_name)
}

function getRoundWeight(roundName: string) {
  const name = normalize(roundName)

  if (name.includes('prelim')) return 5
  if (name.includes('qualif')) return 10
  if (name.includes('playoff') || name.includes('play-off')) return 20
  if (name.includes('1/16') || name.includes('last 32') || name.includes('round of 32')) return 30
  if (name.includes('oitav') || name.includes('1/8') || name.includes('last 16') || name.includes('round of 16')) return 40
  if (name.includes('quarter') || name.includes('quart') || name.includes('1/4')) return 50
  if (name.includes('semi') || name.includes('1/2')) return 60
  if (name.includes('final')) return 70
  return 35
}

type KnockoutBracketProps = {
  matches: BzzoiroEvent[]
}

type KnockoutTie = {
  key: string
  teamA: BzzoiroEvent['home_team']
  teamB: BzzoiroEvent['away_team']
  legs: BzzoiroEvent[]
  aggregateA: number | null
  aggregateB: number | null
}

function getTieKey(match: BzzoiroEvent) {
  return [match.home_team.id, match.away_team.id].sort((a, b) => a - b).join('-')
}

function getTeamGoals(match: BzzoiroEvent, teamId: number) {
  if (match.score.home === null || match.score.away === null) return null
  if (match.home_team.id === teamId) return match.score.home
  if (match.away_team.id === teamId) return match.score.away
  return null
}

function buildTies(roundMatches: BzzoiroEvent[]): KnockoutTie[] {
  const grouped = new Map<string, BzzoiroEvent[]>()

  roundMatches.forEach((match) => {
    const key = getTieKey(match)
    grouped.set(key, [...(grouped.get(key) || []), match])
  })

  return [...grouped.entries()]
    .map(([key, tieMatches]) => {
      const legs = [...tieMatches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      const firstLeg = legs[0]
      const teamA = firstLeg.home_team
      const teamB = firstLeg.away_team
      const scores = legs.map((leg) => ({
        teamA: getTeamGoals(leg, teamA.id),
        teamB: getTeamGoals(leg, teamB.id)
      }))
      const hasAllScores = scores.every((score) => score.teamA !== null && score.teamB !== null)

      return {
        key,
        teamA,
        teamB,
        legs,
        aggregateA: hasAllScores ? scores.reduce((sum, score) => sum + Number(score.teamA), 0) : null,
        aggregateB: hasAllScores ? scores.reduce((sum, score) => sum + Number(score.teamB), 0) : null
      }
    })
    .sort((a, b) => new Date(a.legs[0].date).getTime() - new Date(b.legs[0].date).getTime())
}

function getTieWinner(tie: KnockoutTie) {
  if (tie.aggregateA === null || tie.aggregateB === null || tie.aggregateA === tie.aggregateB) return null
  return tie.aggregateA > tie.aggregateB ? 'teamA' : 'teamB'
}

function formatScore(value: number | null) {
  return value === null ? <Minus className="h-3 w-3" /> : value
}

export default function KnockoutBracket({ matches }: KnockoutBracketProps) {
  const knockoutMatches = getKnockoutMatches(matches)
  const rounds = new Map<string, BzzoiroEvent[]>()

  knockoutMatches.forEach((match) => {
    const roundName = match.round_name || `Ronda ${match.round_number || '?'}`
    rounds.set(roundName, [...(rounds.get(roundName) || []), match])
  })

  const orderedRounds = [...rounds.entries()]
    .sort((a, b) => {
      const weightDiff = getRoundWeight(a[0]) - getRoundWeight(b[0])
      if (weightDiff !== 0) return weightDiff
      return a[0].localeCompare(b[0])
    })
    .map(([roundName, roundMatches]) => [
      roundName,
      buildTies(roundMatches)
    ] as const)

  if (orderedRounds.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-850 bg-zinc-950/20 p-8 text-center text-xs font-semibold text-zinc-500">
        Sem jogos de eliminatórias disponíveis no momento.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-5">
        {orderedRounds.map(([roundName, roundTies], roundIndex) => (
          <div key={roundName} className="w-64 shrink-0 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2">
              <span className="truncate text-[10px] font-black uppercase tracking-wider text-indigo-300">
                {roundName}
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                {roundTies.length} confronto{roundTies.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-3">
              {roundTies.map((tie) => {
                const winner = getTieWinner(tie)
                const isFinal = getRoundWeight(roundName) >= 70
                const primaryMatch = tie.legs[tie.legs.length - 1]

                return (
                  <Link
                    key={`${roundName}-${tie.key}`}
                    href={`/jogo/${primaryMatch.id}`}
                    className="group relative block rounded-2xl border border-zinc-850 bg-zinc-950/35 p-3 transition-all hover:border-indigo-500/35 hover:bg-zinc-900/35"
                  >
                    {roundIndex < orderedRounds.length - 1 && (
                      <span className="absolute -right-5 top-1/2 hidden h-px w-5 bg-zinc-800 md:block" aria-hidden="true" />
                    )}
                    <div className="mb-2 flex items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-wider text-zinc-550">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        <LocalTime utcDateString={tie.legs[0].date} />
                      </span>
                      <span className="flex items-center gap-1.5">
                        {tie.legs.length > 1 && <span>{tie.legs.length} mãos</span>}
                        {isFinal && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs font-bold">
                      <div className={`flex items-center justify-between gap-3 ${winner === 'teamA' ? 'text-white' : 'text-zinc-400'}`}>
                        <span className="min-w-0 truncate group-hover:text-indigo-300">{tie.teamA.name}</span>
                        <span className="font-mono text-zinc-200">{formatScore(tie.aggregateA)}</span>
                      </div>
                      <div className={`flex items-center justify-between gap-3 ${winner === 'teamB' ? 'text-white' : 'text-zinc-400'}`}>
                        <span className="min-w-0 truncate group-hover:text-indigo-300">{tie.teamB.name}</span>
                        <span className="font-mono text-zinc-200">{formatScore(tie.aggregateB)}</span>
                      </div>
                    </div>

                    {tie.legs.length > 1 && (
                      <div className="mt-2 border-t border-zinc-850 pt-2 text-[9px] font-bold uppercase tracking-wider text-zinc-600">
                        Agregado
                        <span className="ml-2 normal-case tracking-normal text-zinc-500">
                          {tie.legs.map((leg, index) => `${index + 1}ª ${leg.score.home ?? '-'}-${leg.score.away ?? '-'}`).join(' · ')}
                        </span>
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
