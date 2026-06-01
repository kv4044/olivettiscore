import { createAdminClient } from '@/utils/supabase/admin'

// ─── Configuração Base ───────────────────────────────────────────────────────

const BZZOIRO_API_URL = 'https://sports.bzzoiro.com/api/v2'

interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

interface RawLeague {
  id: number
  name: string
  country: string
  is_women: boolean
  is_active: boolean
  current_season: any
}

interface RawTeam {
  id: number
  name: string
  short_name: string
  country: string
  venue_id: number | null
}

/**
 * Busca todas as páginas de um endpoint paginado da API Bzzoiro.
 * Segue o link 'next' devolvido pela API diretamente (mais seguro e correto).
 */
async function fetchAllPages<T>(endpoint: string): Promise<T[]> {
  const apiKey = process.env.BZZOIRO_API_KEY
  if (!apiKey) {
    throw new Error('A chave BZZOIRO_API_KEY não está configurada no ficheiro .env.local.')
  }

  const allResults: T[] = []
  // Começa com a primeira página do endpoint
  let nextUrl: string | null = `${BZZOIRO_API_URL}${endpoint}`
  const MAX_PAGES = 200 // Limite de segurança para evitar loops infinitos
  let pageCount = 0

  while (nextUrl && pageCount < MAX_PAGES) {
    pageCount++

    const response = await fetch(nextUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Erro ao buscar ${endpoint} (pág. ${pageCount}): ${response.statusText}`)
    }

    const data: PaginatedResponse<T> = await response.json()

    if (!data.results || data.results.length === 0) break

    allResults.push(...data.results)

    // Seguir o link 'next' fornecido pela API diretamente
    nextUrl = data.next ?? null
  }

  return allResults
}

// ─── Service Público ─────────────────────────────────────────────────────────

export const bzzoiroSyncService = {
  /**
   * Importa TODAS as ligas e equipas disponíveis na API Bzzoiro,
   * percorrendo todas as páginas dos endpoints /leagues/ e /teams/.
   * Insere/atualiza (upsert) os dados na base de dados do Supabase.
   */
  async syncLeaguesAndTeams(): Promise<{
    leaguesSynced: number
    teamsSynced: number
  }> {
    console.log('[Sync] A iniciar sincronização completa de ligas e equipas...')

    // 1. Buscar TODAS as ligas da API (percorrendo paginação)
    const rawLeagues = await fetchAllPages<RawLeague>('/leagues/')
    console.log(`[Sync] Encontradas ${rawLeagues.length} ligas na API Bzzoiro.`)

    // 2. Buscar TODAS as equipas da API (percorrendo paginação)
    const rawTeams = await fetchAllPages<RawTeam>('/teams/')
    console.log(`[Sync] Encontradas ${rawTeams.length} equipas na API Bzzoiro.`)

    // 3. Preparar dados para upsert
    const leaguesToUpsert = rawLeagues.map((l) => ({
      id: l.id,
      name: l.name,
      country: l.country || null,
      updated_at: new Date().toISOString(),
    }))

    const teamsToUpsert = rawTeams
      .filter((t) => t.name && t.name.trim().length > 0) // Ignorar equipas sem nome
      .map((t) => ({
        id: t.id,
        name: t.name,
        short_name: t.short_name || null,
        updated_at: new Date().toISOString(),
      }))

    if (leaguesToUpsert.length === 0 && teamsToUpsert.length === 0) {
      return { leaguesSynced: 0, teamsSynced: 0 }
    }

    // 4. Inicializar o cliente Supabase administrativo (ignora o RLS para escrita)
    const supabase = createAdminClient()

    // 5. Inserir/Atualizar Ligas
    let leaguesSynced = 0
    if (leaguesToUpsert.length > 0) {
      // Upsert em lotes de 500 para evitar limites de payload
      for (let i = 0; i < leaguesToUpsert.length; i += 500) {
        const batch = leaguesToUpsert.slice(i, i + 500)
        const { error } = await supabase
          .from('leagues')
          .upsert(batch, { onConflict: 'id' })

        if (error) {
          throw new Error(`Erro ao sincronizar ligas (lote ${i}): ${error.message}`)
        }
      }
      leaguesSynced = leaguesToUpsert.length
      console.log(`[Sync] ${leaguesSynced} ligas sincronizadas com sucesso.`)
    }

    // 6. Inserir/Atualizar Equipas
    let teamsSynced = 0
    if (teamsToUpsert.length > 0) {
      // Upsert em lotes de 500 para evitar limites de payload
      for (let i = 0; i < teamsToUpsert.length; i += 500) {
        const batch = teamsToUpsert.slice(i, i + 500)
        const { error } = await supabase
          .from('teams')
          .upsert(batch, { onConflict: 'id' })

        if (error) {
          throw new Error(`Erro ao sincronizar equipas (lote ${i}): ${error.message}`)
        }
      }
      teamsSynced = teamsToUpsert.length
      console.log(`[Sync] ${teamsSynced} equipas sincronizadas com sucesso.`)
    }

    console.log(`[Sync] Sincronização completa! Ligas: ${leaguesSynced}, Equipas: ${teamsSynced}`)
    return { leaguesSynced, teamsSynced }
  }
}
