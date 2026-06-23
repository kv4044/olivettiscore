import { getTeamsLogos } from '@/services/logoService'

export function getStandingsRows(standings: any): any[] {
  if (!standings) return []

  if (standings.grouped && standings.groups) {
    return Object.values(standings.groups).flatMap((rows: any) => Array.isArray(rows) ? rows : [])
  }

  return Array.isArray(standings.standings) ? standings.standings : []
}

export async function enrichStandingsWithLogos(standings: any) {
  if (!standings) return standings

  const rows = getStandingsRows(standings)
  const teams = rows
    .filter((row) => row.team_id && row.team_name)
    .map((row) => ({ id: Number(row.team_id), name: row.team_name }))

  if (teams.length === 0) return standings

  try {
    const logoMap = await getTeamsLogos(teams)
    const addLogo = (row: any) => ({
      ...row,
      team_logo: logoMap[Number(row.team_id)]
    })

    if (standings.grouped && standings.groups) {
      return {
        ...standings,
        groups: Object.fromEntries(
          Object.entries(standings.groups).map(([groupName, groupRows]: [string, any]) => [
            groupName,
            Array.isArray(groupRows) ? groupRows.map(addLogo) : groupRows
          ])
        )
      }
    }

    if (Array.isArray(standings.standings)) {
      return {
        ...standings,
        standings: standings.standings.map(addLogo)
      }
    }
  } catch (err) {
    console.error('Erro ao obter logos das equipas da classificação:', err)
  }

  return standings
}
