import { createAdminClient } from '@/utils/supabase/admin'
import { getLeagueLogoUrl } from '@/utils/leagueLogo'

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

const TEAM_NAME_TRANSLATIONS: Record<string, string> = {
  'espanha': 'Spain',
  'alemanha': 'Germany',
  'itália': 'Italy',
  'italia': 'Italy',
  'frança': 'France',
  'franca': 'France',
  'brasil': 'Brazil',
  'inglaterra': 'England',
  'países baixos': 'Netherlands',
  'paises baixos': 'Netherlands',
  'holanda': 'Netherlands',
  'marrocos': 'Morocco',
  'suiça': 'Switzerland',
  'suíça': 'Switzerland',
  'camarões': 'Cameroon',
  'camaroes': 'Cameroon',
  'gales': 'Wales',
  'irlanda': 'Ireland',
  'escócia': 'Scotland',
  'escocia': 'Scotland',
  'estados unidos': 'USA',
  'eua': 'USA',
  'coreia do sul': 'South Korea',
  'japão': 'Japan',
  'japao': 'Japan',
  'uruguai': 'Uruguay',
  'méxico': 'Mexico',
  'mexico': 'Mexico',
  'polónia': 'Poland',
  'polonia': 'poland',
  'dinamarca': 'Denmark',
  'tunísia': 'Tunisia',
  'tunisia': 'Tunisia',
  'gana': 'Ghana',
  'senegal': 'Senegal',
  'equador': 'Ecuador',
  'catar': 'Qatar',
  'austrália': 'Australia',
  'australia': 'Australia',
  'croácia': 'Croatia',
  'croatia': 'Croatia',
  'suécia': 'Sweden',
  'suecia': 'Sweden',
  'ucrânia': 'Ukraine',
  'ucrania': 'Ukraine',
  'chéquia': 'Czech Republic',
  'republica checa': 'Czech Republic',
  'república checa': 'Czech Republic',
  'áustria': 'Austria',
  'austria': 'Austria',
  'turquia': 'Turkey',
  'bélgica': 'Belgium',
  'belgica': 'Belgium',
  'finlândia': 'Finland',
  'finlandia': 'Finland',
  'hungria': 'Hungary',
  'eslováquia': 'Slovakia',
  'eslovaquia': 'Slovakia',
  'roménia': 'Romania',
  'romenia': 'Romania',
  'albânia': 'Albania',
  'albania': 'Albania',
  'geórgia': 'Georgia',
  'georgia': 'Georgia',
  'eslovénia': 'Slovenia',
  'eslovenia': 'Slovenia',
  'sérvia': 'Serbia',
  'servia': 'Serbia'
};

function normalizeLookupName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function compactLookupName(value: string) {
  return normalizeLookupName(value)
    .replace(/\b(fc|cf|sc|afc|ac|cd|ud|fk|sk|bk|if|as|de|the)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isTrustedTeamMatch(candidateName: string, expectedNames: string[]) {
  const candidate = normalizeLookupName(candidateName)
  const compactCandidate = compactLookupName(candidateName)

  return expectedNames.some((expectedName) => {
    const expected = normalizeLookupName(expectedName)
    const compactExpected = compactLookupName(expectedName)

    return candidate === expected || compactCandidate === compactExpected
  })
}

const TEAM_LOGO_FALLBACKS: Record<string, string> = {
  'paris saint germain': 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Paris_Saint-Germain_F.C..svg/330px-Paris_Saint-Germain_F.C..svg.png',
  'psg': 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Paris_Saint-Germain_F.C..svg/330px-Paris_Saint-Germain_F.C..svg.png',
  'atalanta': 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Atalanta_BC_new_logo.svg/330px-Atalanta_BC_new_logo.svg.png',
  'club brugge kv': 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d0/Club_Brugge_KV_logo.svg/250px-Club_Brugge_KV_logo.svg.png',
  'club brugge': 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d0/Club_Brugge_KV_logo.svg/250px-Club_Brugge_KV_logo.svg.png',
  'olympique de marseille': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Olympique_de_Marseille_2026_logo.svg/330px-Olympique_de_Marseille_2026_logo.svg.png',
  'marseille': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Olympique_de_Marseille_2026_logo.svg/330px-Olympique_de_Marseille_2026_logo.svg.png',
  'cd nacional': 'https://upload.wikimedia.org/wikipedia/en/thumb/9/90/C.D._Nacional_logo.svg/330px-C.D._Nacional_logo.svg.png',
  'senegal': 'https://upload.wikimedia.org/wikipedia/en/thumb/1/16/Senegalese_Football_Federation_logo.svg/330px-Senegalese_Football_Federation_logo.svg.png',
  'lille': 'https://r2.thesportsdb.com/images/media/team/badge/2giize1534005340.png',
  'losc lille': 'https://r2.thesportsdb.com/images/media/team/badge/2giize1534005340.png',
  'sporting braga': 'https://r2.thesportsdb.com/images/media/team/badge/8g4aod1678717261.png',
  'sc braga': 'https://r2.thesportsdb.com/images/media/team/badge/8g4aod1678717261.png',
  'fc internazionale milano': 'https://r2.thesportsdb.com/images/media/team/badge/ryhu6d1617113103.png',
  'internazionale': 'https://r2.thesportsdb.com/images/media/team/badge/ryhu6d1617113103.png',
  'inter': 'https://r2.thesportsdb.com/images/media/team/badge/ryhu6d1617113103.png',
  'sport lisboa e benfica': 'https://r2.thesportsdb.com/images/media/team/badge/hj4kyc1781152436.png',
  'benfica': 'https://r2.thesportsdb.com/images/media/team/badge/hj4kyc1781152436.png',
  'bodo glimt': 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8d/FK_Bodo_Glimt_logo.svg/250px-FK_Bodo_Glimt_logo.svg.png',
  'fk bodo glimt': 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8d/FK_Bodo_Glimt_logo.svg/250px-FK_Bodo_Glimt_logo.svg.png',
  'royale union saint gilloise': 'https://upload.wikimedia.org/wikipedia/fr/thumb/8/87/Logo_Royale_Union_Saint-Gilloise_2025.svg/langfr-250px-Logo_Royale_Union_Saint-Gilloise_2025.svg.png',
  'union saint gilloise': 'https://upload.wikimedia.org/wikipedia/fr/thumb/8/87/Logo_Royale_Union_Saint-Gilloise_2025.svg/langfr-250px-Logo_Royale_Union_Saint-Gilloise_2025.svg.png',
  'fc kobenhavn': 'https://r2.thesportsdb.com/images/media/team/badge/styqtr1473535513.png',
  'fc copenhagen': 'https://r2.thesportsdb.com/images/media/team/badge/styqtr1473535513.png',
  'sk slavia praha': 'https://r2.thesportsdb.com/images/media/team/badge/l7kl4n1759252139.png',
  'slavia prague': 'https://r2.thesportsdb.com/images/media/team/badge/l7kl4n1759252139.png',
  'bosnia and herzegovina': 'https://r2.thesportsdb.com/images/media/team/badge/wtqqst1455463120.png',
  'dr congo': 'https://r2.thesportsdb.com/images/media/team/badge/s85jjw1728749022.png',
  'democratic republic of the congo': 'https://r2.thesportsdb.com/images/media/team/badge/s85jjw1728749022.png'
}

const TEAM_LOGO_FALLBACKS_BY_ID: Record<number, string> = {
  23: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/90/C.D._Nacional_logo.svg/330px-C.D._Nacional_logo.svg.png',
  36: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d5/Vit%C3%B3ria_Guimar%C3%A3es.svg/330px-Vit%C3%B3ria_Guimar%C3%A3es.svg.png',
  51: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/98/Club_Athletic_Bilbao_logo.svg/250px-Club_Athletic_Bilbao_logo.svg.png',
  71: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Atalanta_BC_new_logo.svg/330px-Atalanta_BC_new_logo.svg.png',
  98: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Olympique_de_Marseille_2026_logo.svg/330px-Olympique_de_Marseille_2026_logo.svg.png',
  114: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Paris_Saint-Germain_F.C..svg/330px-Paris_Saint-Germain_F.C..svg.png',
  123: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d0/Club_Brugge_KV_logo.svg/250px-Club_Brugge_KV_logo.svg.png',
  157: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Esporte_Clube_Vit%C3%B3ria_%282024%29.svg/960px-Esporte_Clube_Vit%C3%B3ria_%282024%29.svg.png',
  486: 'https://upload.wikimedia.org/wikipedia/en/thumb/1/16/Senegalese_Football_Federation_logo.svg/330px-Senegalese_Football_Federation_logo.svg.png',
  843: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Athletic_Club_%28Minas_Gerais%29.svg/330px-Athletic_Club_%28Minas_Gerais%29.svg.png'
}

const TEAM_NAME_ALIASES: Record<string, string[]> = {
  'fc internazionale milano': ['Inter Milan', 'Internazionale'],
  'internazionale': ['Inter Milan'],
  'inter': ['Inter Milan'],
  'sporting braga': ['SC Braga', 'Braga'],
  'sport lisboa e benfica': ['Benfica'],
  'benfica': ['Sport Lisboa e Benfica'],
  'fc bayern munchen': ['Bayern Munich', 'FC Bayern München'],
  'bayern munchen': ['Bayern Munich', 'FC Bayern München'],
  'atletico madrid': ['Atlético Madrid', 'Atletico Madrid'],
  'psv eindhoven': ['PSV Eindhoven'],
  'club brugge kv': ['Club Brugge'],
  'crvena zvezda': ['Red Star Belgrade'],
  'bayer 04 leverkusen': ['Bayer Leverkusen'],
  'futbol club barcelona': ['FC Barcelona', 'Barcelona'],
  'bodo glimt': ['FK Bodo/Glimt', 'Bodo/Glimt', 'FK Bodø/Glimt', 'Bodø/Glimt'],
  'royale union saint gilloise': ['Union Saint-Gilloise', 'Union SG', 'USG'],
  'fc kobenhavn': ['FC Copenhagen', 'F.C. Kobenhavn', 'F.C. København'],
  'sk slavia praha': ['Slavia Prague'],
  'bosnia and herzegovina': ['Bosnia and Herzegovina'],
  'dr congo': ['Democratic Republic of the Congo'],
  'eua': ['United States', 'United States of America'],
  'usa': ['United States', 'United States of America']
}

async function fetchLogoFromAPI(teamName: string, expectedNames: string[] = [teamName]): Promise<string | null> {
  const apiKey = process.env.THESPORTSDB_API_KEY || '3'
  
  let searchName = teamName.trim();
  const lowerName = normalizeLookupName(searchName);
  if (TEAM_NAME_TRANSLATIONS[lowerName]) {
    searchName = TEAM_NAME_TRANSLATIONS[lowerName];
  }
  
  const url = `${THESPORTSDB_BASE_URL}/${apiKey}/searchteams.php?t=${encodeURIComponent(searchName)}`
  
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } }) // Cache de 1 dia na resposta HTTP
    if (!res.ok) return null
    
    const data = (await res.json()) as TheSportsDBResponse
    if (!data.teams || data.teams.length === 0) return null
    
    // Filtrar apenas equipas cujo desporto seja "Soccer"
    const soccerTeams = data.teams.filter(t => t.strSport?.toLowerCase() === 'soccer')
    if (soccerTeams.length === 0) return null
    
    // 1. Procurar correspondência exata do nome original ou nome traduzido
    const exactMatch = soccerTeams.find(t => 
      t.strTeam.toLowerCase() === teamName.toLowerCase() ||
      t.strTeam.toLowerCase() === searchName.toLowerCase()
    )
    if (exactMatch && exactMatch.strBadge) {
      return exactMatch.strBadge
    }
    
    // Aceitar apenas resultados que batem com o nome esperado ou aliases controlados.
    const trustedMatch = soccerTeams.find(t =>
      t.strBadge && isTrustedTeamMatch(t.strTeam, [...expectedNames, searchName])
    )

    return trustedMatch?.strBadge || null
  } catch (error) {
    console.error(`[LogoService] Erro ao obter logo da equipa ${teamName} do TheSportsDB:`, error)
    return null
  }
}

async function resolveTeamLogo(teamName: string, teamId?: number): Promise<string | null> {
  if (teamId && TEAM_LOGO_FALLBACKS_BY_ID[teamId]) {
    return TEAM_LOGO_FALLBACKS_BY_ID[teamId]
  }

  const normalizedName = normalizeLookupName(teamName)
  if (TEAM_LOGO_FALLBACKS[normalizedName]) {
    return TEAM_LOGO_FALLBACKS[normalizedName]
  }

  const aliases = TEAM_NAME_ALIASES[normalizedName] || []
  const expectedNames = [teamName, ...aliases]

  const directLogo = await fetchLogoFromAPI(teamName, expectedNames)
  if (directLogo) return directLogo

  for (const alias of aliases) {
    const aliasLogo = await fetchLogoFromAPI(alias, expectedNames)
    if (aliasLogo) return aliasLogo
  }

  return null
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
    
    // Se a equipa já existe na BD e já tem um logo definido (que não seja 'no_logo')
    if (dbTeam && dbTeam.logo_url !== null && dbTeam.logo_url.trim() !== '' && dbTeam.logo_url !== 'no_logo') {
      logoMap[team.id] = dbTeam.logo_url
      return
    }
    
    // Cache miss: ou a equipa não existe ou o logo_url é NULL
    console.log(`[LogoService] Cache miss para ${team.name} (ID: ${team.id}). A pesquisar no TheSportsDB...`)
    const logoUrl = await resolveTeamLogo(team.name, team.id)
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
  27: '4429',  // Mundial (Copa do Mundo / World Cup)
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
    logoMap[Number(id)] = detail.logoUrl || getLeagueLogoUrl({
      id: Number(id),
      name: detail.name || `Liga #${id}`,
      country: detail.country
    })
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
      logoUrl: getLeagueLogoUrl({ id: league.id, name, country, logoUrl }),
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

