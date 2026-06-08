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
