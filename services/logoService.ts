import { createAdminClient } from '@/utils/supabase/admin'

const THESPORTSDB_BASE_URL = 'https://www.thesportsdb.com/api/v1/json'

interface TheSportsDBTeam {
  idTeam: string
  strTeam: string
  strBadge: string
  strSport: string
  strCountry: string
}

interface TheSportsDBResponse {
  teams: TheSportsDBTeam[] | null
}

/**
 * Procura o logo da equipa no TheSportsDB através do nome.
 */
async function fetchLogoFromAPI(teamName: string): Promise<string | null> {
  const apiKey = process.env.THESPORTSDB_API_KEY || '3'
  const url = `${THESPORTSDB_BASE_URL}/${apiKey}/searchteams.php?t=${encodeURIComponent(teamName)}`
  
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } }) // Cache de 1 dia na resposta HTTP
    if (!res.ok) return null
    
    const data = (await res.json()) as TheSportsDBResponse
    if (!data.teams || data.teams.length === 0) return null
    
    // Filtrar apenas equipas cujo desporto seja "Soccer"
    const soccerTeams = data.teams.filter(t => t.strSport?.toLowerCase() === 'soccer')
    if (soccerTeams.length === 0) return null
    
    // 1. Procurar correspondência exata do nome (ignora maiúsculas/minúsculas)
    const exactMatch = soccerTeams.find(t => t.strTeam.toLowerCase() === teamName.toLowerCase())
    if (exactMatch && exactMatch.strBadge) {
      return exactMatch.strBadge
    }
    
    // 2. Se não houver correspondência exata, escolher a primeira equipa de futebol devolvida
    const firstTeam = soccerTeams[0]
    return firstTeam.strBadge || null
  } catch (error) {
    console.error(`[LogoService] Erro ao obter logo da equipa ${teamName} do TheSportsDB:`, error)
    return null
  }
}

/**
 * Obtém os logos das equipas especificadas. Consulta primeiro a base de dados
 * e, em caso de miss (ou se o logo for nulo), pesquisa na API do TheSportsDB
 * e guarda o resultado na base de dados em lote.
 * 
 * @param teams Array de equipas com ID e Nome.
 * @returns Um objeto mapeando o ID da equipa para o URL do seu logo.
 */
export async function getTeamsLogos(teams: { id: number; name: string }[]): Promise<Record<number, string>> {
  if (teams.length === 0) return {}

  // 1. Deduplicar equipas recebidas pelo ID para otimizar queries
  const uniqueTeamsMap = new Map<number, string>()
  teams.forEach(t => {
    if (t.id && t.name) {
      uniqueTeamsMap.set(t.id, t.name)
    }
  })
  const uniqueTeams = Array.from(uniqueTeamsMap.entries()).map(([id, name]) => ({ id, name }))

  const supabase = createAdminClient()
  const teamIds = uniqueTeams.map(t => t.id)
  
  // 2. Consultar base de dados para ver os logos já existentes
  const { data: dbTeams, error } = await supabase
    .from('teams')
    .select('id, name, logo_url')
    .in('id', teamIds)
    
  if (error) {
    console.error('[LogoService] Erro ao obter equipas da base de dados:', error)
  }
  
  const logoMap: Record<number, string> = {}
  const dbTeamMap = new Map<number, { logo_url: string | null; name: string }>()
  
  if (dbTeams) {
    dbTeams.forEach(t => {
      dbTeamMap.set(Number(t.id), { logo_url: t.logo_url, name: t.name })
    })
  }
  
  const recordsToUpsert: { id: number; name: string; logo_url: string; updated_at: string }[] = []
  
  // 3. Processar cada equipa
  const apiFetchPromises = uniqueTeams.map(async (team) => {
    const dbTeam = dbTeamMap.get(team.id)
    
    // Se a equipa já existe na BD e já tem um logo definido (ou marcador 'no_logo')
    if (dbTeam && dbTeam.logo_url !== null) {
      if (dbTeam.logo_url && dbTeam.logo_url !== 'no_logo') {
        logoMap[team.id] = dbTeam.logo_url
      }
      return
    }
    
    // Cache miss: ou a equipa não existe ou o logo_url é NULL
    console.log(`[LogoService] Cache miss para ${team.name} (ID: ${team.id}). A pesquisar no TheSportsDB...`)
    const logoUrl = await fetchLogoFromAPI(team.name)
    const finalLogoUrl = logoUrl || 'no_logo'
    
    // Adicionar à lista de registos para atualizar na BD
    recordsToUpsert.push({
      id: team.id,
      name: team.name,
      logo_url: finalLogoUrl,
      updated_at: new Date().toISOString()
    })
    
    if (logoUrl) {
      logoMap[team.id] = logoUrl
    }
  })
  
  // Esperar por todas as consultas de API concorrentes
  await Promise.all(apiFetchPromises)
  
  // 4. Efetuar upsert dos novos logos em lote para otimizar acessos à BD
  if (recordsToUpsert.length > 0) {
    console.log(`[LogoService] A guardar ${recordsToUpsert.length} logos na base de dados...`)
    const { error: upsertError } = await supabase
      .from('teams')
      .upsert(recordsToUpsert, { onConflict: 'id' })
      
    if (upsertError) {
      console.error('[LogoService] Erro ao atualizar/inserir logos das equipas na base de dados:', upsertError)
    } else {
      console.log('[LogoService] Logos guardados com sucesso!')
    }
  }
  
  return logoMap
}

// ─── Enriquecimento de Logos das Ligas ────────────────────────────────────────

const BZZOIRO_TO_SPORTSDB_LEAGUE: Record<number, string> = {
  1: '4328',   // Premier League (Inglaterra)
  2: '4335',   // La Liga (Espanha)
  3: '4332',   // Serie A (Itália)
  4: '4331',   // Bundesliga (Alemanha)
  5: '4393',   // 2. Bundesliga (Alemanha)
  6: '4334',   // Ligue 1 (França)
  7: '4337',   // Eredivisie (Holanda)
  8: '4344',   // Série A (Brasil)
  9: '4345',   // Série B (Brasil)
  10: '4340',  // Primeira Liga (Portugal)
  13: '4330',  // Scottish Premiership (Playoffs fallback)
  18: '4346',  // MLS (EUA)
  20: '4350',  // Liga MX (México)
  26: '4338',  // Allsvenskan (Suécia)
  34: '4791',  // Série C (Brasil)
  54: '4339',  // Eliteserien (Noruega)
}

/**
 * Procura o logo da liga no TheSportsDB através do ID mapeado.
 */
async function fetchLeagueLogoFromAPI(sportsDbId: string): Promise<string | null> {
  const apiKey = process.env.THESPORTSDB_API_KEY || '3'
  const url = `${THESPORTSDB_BASE_URL}/${apiKey}/lookupleague.php?id=${sportsDbId}`
  
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } }) // Cache de 1 dia na resposta HTTP
    if (!res.ok) return null
    
    const data = await res.json()
    if (!data.leagues || data.leagues.length === 0) return null
    
    return data.leagues[0].strBadge || null
  } catch (error) {
    console.error(`[LogoService] Erro ao obter logo da liga ID ${sportsDbId} do TheSportsDB:`, error)
    return null
  }
}

/**
 * Obtém os logos das ligas especificadas. Consulta primeiro a base de dados
 * e, em caso de miss (ou se o logo for nulo), pesquisa na API do TheSportsDB
 * e guarda o resultado na base de dados em lote.
 * 
 * @param leagues Array de ligas com ID e Nome.
 * @returns Um objeto mapeando o ID da liga para o URL do seu logo.
 */
/**
 * Procura os detalhes da liga na API Bzzoiro.
 */
async function fetchLeagueFromBzzoiro(leagueId: number): Promise<{ name: string; country: string | null } | null> {
  const apiKey = process.env.BZZOIRO_API_KEY
  if (!apiKey) return null
  
  try {
    const res = await fetch(`https://sports.bzzoiro.com/api/v2/leagues/${leagueId}/`, {
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Accept': 'application/json',
      }
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      name: data.name,
      country: data.country || null
    }
  } catch (error) {
    console.error(`[LogoService] Erro ao obter liga ID ${leagueId} da API Bzzoiro:`, error)
    return null
  }
}

/**
 * Obtém os logos das ligas especificadas. Consulta primeiro a base de dados
 * e, em caso de miss (ou se o logo for nulo), pesquisa na API do TheSportsDB
 * e guarda o resultado na base de dados em lote.
 * 
 * @param leagues Array de ligas com ID e Nome.
 * @returns Um objeto mapeando o ID da liga para o URL do seu logo.
 */
export async function getLeaguesLogos(leagues: { id: number; name: string }[]): Promise<Record<number, string>> {
  const details = await getLeaguesDetails(leagues)
  const logoMap: Record<number, string> = {}
  Object.entries(details).forEach(([id, detail]) => {
    if (detail.logoUrl) {
      logoMap[Number(id)] = detail.logoUrl
    }
  })
  return logoMap
}

export interface LeagueDetails {
  logoUrl?: string
  name?: string
  country?: string
}

/**
 * Obtém os detalhes das ligas especificadas (logo, nome e país).
 * Consulta a base de dados e, em caso de miss do logo, tenta pesquisar no TheSportsDB.
 * Se o nome for ausente ou genérico (ex: "Liga #55"), consulta a API do Bzzoiro.
 */
export async function getLeaguesDetails(leagues: { id: number; name: string }[]): Promise<Record<number, LeagueDetails>> {
  if (leagues.length === 0) return {}

  // Deduplicar ligas recebidas pelo ID para otimizar queries
  const uniqueLeaguesMap = new Map<number, string>()
  leagues.forEach(l => {
    if (l.id && l.name) {
      uniqueLeaguesMap.set(l.id, l.name)
    }
  })
  const uniqueLeagues = Array.from(uniqueLeaguesMap.entries()).map(([id, name]) => ({ id, name }))

  const supabase = createAdminClient()
  const leagueIds = uniqueLeagues.map(l => l.id)
  
  // Consultar base de dados para ver as ligas já existentes
  const { data: dbLeagues, error } = await supabase
    .from('leagues')
    .select('id, name, country, logo_url')
    .in('id', leagueIds)
    
  if (error) {
    console.error('[LogoService] Erro ao obter ligas da base de dados:', error)
  }
  
  const detailsMap: Record<number, LeagueDetails> = {}
  const dbLeagueMap = new Map<number, { logo_url: string | null; name: string; country: string | null }>()
  
  if (dbLeagues) {
    dbLeagues.forEach(l => {
      dbLeagueMap.set(Number(l.id), { logo_url: l.logo_url, name: l.name, country: l.country })
    })
  }
  
  const recordsToUpsert: { id: number; name: string; logo_url: string; country: string | null; updated_at: string }[] = []
  
  // Processar cada liga
  const apiFetchPromises = uniqueLeagues.map(async (league) => {
    const dbLeague = dbLeagueMap.get(league.id)
    
    // Se a liga já existe na BD, tem um logo definido (ou marcador 'no_logo') E o nome não é genérico ("Liga #X")
    if (dbLeague && dbLeague.logo_url !== null && dbLeague.name && !dbLeague.name.startsWith('Liga #')) {
      detailsMap[league.id] = {
        logoUrl: (dbLeague.logo_url && dbLeague.logo_url !== 'no_logo') ? dbLeague.logo_url : undefined,
        name: dbLeague.name,
        country: dbLeague.country || undefined
      }
      return
    }
    
    // Cache miss ou nome genérico no DB
    let name = dbLeague?.name || league.name
    let country = dbLeague?.country || undefined
    
    // Se não temos o nome correto (ou seja, é genérico "Liga #X" ou ausente)
    if (name.startsWith('Liga #')) {
      console.log(`[LogoService] A liga ID ${league.id} tem nome genérico ("${name}"). A consultar API Bzzoiro...`)
      const bzzoiroLeague = await fetchLeagueFromBzzoiro(league.id)
      if (bzzoiroLeague) {
        name = bzzoiroLeague.name
        country = bzzoiroLeague.country || undefined
      }
    }
    
    // Agora tratamos do logo (se ainda não tiver logo, ou se for cache miss)
    let logoUrl: string | null = dbLeague?.logo_url || null
    if (logoUrl === null) {
      const sportsDbId = BZZOIRO_TO_SPORTSDB_LEAGUE[league.id]
      if (sportsDbId) {
        console.log(`[LogoService] Cache miss para logo da liga ${name} (ID: ${league.id}). A pesquisar no TheSportsDB...`)
        logoUrl = await fetchLeagueLogoFromAPI(sportsDbId)
      }
    }
    
    const finalLogoUrl = logoUrl || 'no_logo'
    
    recordsToUpsert.push({
      id: league.id,
      name: name,
      logo_url: finalLogoUrl,
      country: country || null,
      updated_at: new Date().toISOString()
    })
    
    detailsMap[league.id] = {
      logoUrl: (logoUrl && logoUrl !== 'no_logo') ? logoUrl : undefined,
      name: name,
      country: country
    }
  })
  
  // Esperar por todas as consultas concorrentes
  await Promise.all(apiFetchPromises)
  
  // Efetuar upsert em lote com os nomes reais corrigidos e os logos
  if (recordsToUpsert.length > 0) {
    console.log(`[LogoService] A atualizar/guardar ${recordsToUpsert.length} ligas na base de dados...`)
    const { error: upsertError } = await supabase
      .from('leagues')
      .upsert(recordsToUpsert, { onConflict: 'id' })
      
    if (upsertError) {
      console.error('[LogoService] Erro ao atualizar/inserir ligas na base de dados:', upsertError)
    }
  }
  
  return detailsMap
}

