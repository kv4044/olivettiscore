import Link from 'next/link'

type StandingRow = Record<string, unknown>
type StandingsGroups = Record<string, unknown>
type StandingsData = {
  grouped?: boolean
  groups?: StandingsGroups
  standings?: unknown
}

type StandingsTableProps = {
  standings: StandingsData | null | undefined
  highlightedTeamIds?: Array<number | string>
  maxHeightClassName?: string
  compact?: boolean
}

function isRow(value: unknown): value is StandingRow {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function toRowArray(rows: unknown): StandingRow[] {
  return Array.isArray(rows) ? rows.filter(isRow) : []
}

function toRows(standings: StandingsData | null | undefined): StandingRow[] {
  if (!standings) return []

  if (standings.grouped && standings.groups) {
    return Object.values(standings.groups).flatMap(toRowArray)
  }

  return toRowArray(standings.standings)
}

function getValue(row: StandingRow, keys: string[]) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  }

  return null
}

function getGoalDifference(row: StandingRow) {
  const directValue = getValue(row, ['gd', 'goal_difference', 'goals_difference', 'diff'])
  if (directValue !== null) return Number(directValue)

  const goalsFor = getValue(row, ['gf', 'goals_for'])
  const goalsAgainst = getValue(row, ['ga', 'goals_against'])
  if (goalsFor !== null && goalsAgainst !== null) return Number(goalsFor) - Number(goalsAgainst)

  return null
}

function formatCell(value: unknown) {
  return value === null || value === undefined || value === '' ? '-' : String(value)
}

export function getStandingsRows(standings: StandingsData | null | undefined): StandingRow[] {
  return toRows(standings)
}

export default function StandingsTable({
  standings,
  highlightedTeamIds = [],
  maxHeightClassName,
  compact = false
}: StandingsTableProps) {
  const highlightedIds = new Set(highlightedTeamIds.map((id) => Number(id)))
  const hasGroups = Boolean(standings?.grouped && standings?.groups)
  const wrapperClassName = [
    maxHeightClassName,
    maxHeightClassName ? 'overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent' : ''
  ].filter(Boolean).join(' ')

  const renderTable = (rows: StandingRow[]) => (
    <div className="overflow-x-auto">
      <table className={`w-full min-w-[620px] text-left ${compact ? 'text-[11px]' : 'text-xs'} border-collapse`}>
        <thead>
          <tr className="bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-[9px] border-b border-zinc-850">
            <th className="py-2.5 px-3 text-center w-10">Lugar</th>
            <th className="py-2.5 px-2 text-center w-12">Logo</th>
            <th className="py-2.5 px-2 min-w-[150px]">Equipa</th>
            <th className="py-2.5 px-2 text-center">J</th>
            <th className="py-2.5 px-2 text-center">V</th>
            <th className="py-2.5 px-2 text-center">E</th>
            <th className="py-2.5 px-2 text-center">D</th>
            <th className="py-2.5 px-2 text-center">DG</th>
            <th className="py-2.5 px-3 text-center font-black">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900/50">
          {rows.map((row) => {
            const teamId = Number(row.team_id)
            const isHighlighted = highlightedIds.has(teamId)
            const goalDifference = getGoalDifference(row)
            const teamName = formatCell(row.team_name)

            return (
              <tr
                key={String(row.team_id)}
                className={`transition-colors ${
                  isHighlighted
                    ? 'bg-indigo-500/10 text-indigo-300 font-black border-l-2 border-l-indigo-500'
                    : 'text-zinc-400 hover:bg-zinc-900/20'
                }`}
              >
                <td className="py-2.5 px-3 text-center font-bold">
                  {formatCell(row.position)}
                </td>
                <td className="py-2.5 px-2">
                  <Link
                    href={`/equipa/${row.team_id}`}
                    className="mx-auto flex h-5 w-5 items-center justify-center"
                    aria-label={teamName !== '-' ? `Abrir ${teamName}` : 'Abrir equipa'}
                  >
                    {typeof row.team_logo === 'string' && row.team_logo !== 'no_logo' ? (
                      <img src={row.team_logo} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <span className="h-5 w-5 rounded bg-zinc-900" aria-hidden="true" />
                    )}
                  </Link>
                </td>
                <td className="py-2.5 px-2 font-bold">
                  <Link
                    href={`/equipa/${row.team_id}`}
                    className="block min-w-0 truncate hover:text-indigo-400 hover:underline"
                  >
                    {teamName}
                  </Link>
                </td>
                <td className="py-2.5 px-2 text-center font-medium">
                  {formatCell(getValue(row, ['played', 'games_played', 'matches_played']))}
                </td>
                <td className="py-2.5 px-2 text-center">
                  {formatCell(getValue(row, ['won', 'wins']))}
                </td>
                <td className="py-2.5 px-2 text-center">
                  {formatCell(getValue(row, ['drawn', 'draws']))}
                </td>
                <td className="py-2.5 px-2 text-center">
                  {formatCell(getValue(row, ['lost', 'losses']))}
                </td>
                <td
                  className={`py-2.5 px-2 text-center font-bold ${
                    goalDifference === null
                      ? 'text-zinc-500'
                      : goalDifference > 0
                        ? 'text-emerald-400'
                        : goalDifference < 0
                          ? 'text-red-400'
                          : 'text-zinc-500'
                  }`}
                >
                  {goalDifference === null ? '-' : `${goalDifference > 0 ? '+' : ''}${goalDifference}`}
                </td>
                <td className={`py-2.5 px-3 text-center font-black ${isHighlighted ? 'text-indigo-400' : 'text-zinc-200'}`}>
                  {formatCell(getValue(row, ['pts', 'points']))}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  if (!standings || (!standings.standings && !standings.groups)) {
    return null
  }

  if (!hasGroups) {
    return (
      <div className={`border border-zinc-850 rounded-2xl overflow-hidden bg-zinc-950/20 ${wrapperClassName}`}>
        {renderTable(toRows(standings))}
      </div>
    )
  }

  const groups = standings.groups ?? {}

  return (
    <div className={`space-y-6 ${wrapperClassName}`}>
      {Object.entries(groups)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([groupName, rows]) => (
          <div key={groupName} className="space-y-2">
            <div className="bg-indigo-500/10 border border-indigo-950/30 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center justify-between">
              <span>{groupName}</span>
              <span className="text-[9px] text-zinc-500 font-normal normal-case">Grupo</span>
            </div>
            <div className="border border-zinc-850 rounded-2xl overflow-hidden bg-zinc-950/20">
              {renderTable(toRowArray(rows))}
            </div>
          </div>
        ))}
    </div>
  )
}
