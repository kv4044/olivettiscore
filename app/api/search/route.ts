import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ leagues: [], teams: [], players: [] })
  }

  try {
    const supabase = await createClient()

    // Mapeamento de aliases/sinónimos em português para IDs de ligas populares
    const LEAGUE_ALIASES: { keywords: string[]; id: number }[] = [
      { keywords: ['portuguesa', 'portugues', 'portugal', 'betclic', 'primeira liga'], id: 2 },
      { keywords: ['espanhola', 'espanhol', 'espanha', 'la liga', 'laliga', 'santander'], id: 3 },
      { keywords: ['inglesa', 'ingles', 'inglaterra', 'premier'], id: 1 },
      { keywords: ['italiana', 'italiano', 'italia', 'itália', 'serie a', 'calcio'], id: 4 },
      { keywords: ['alema', 'alemã', 'alemao', 'alemão', 'alemanha', 'bundesliga'], id: 5 },
      { keywords: ['francesa', 'frances', 'frança', 'ligue 1', 'ligue1'], id: 6 },
      { keywords: ['holandesa', 'holandes', 'holanda', 'eredivisie'], id: 10 },
      { keywords: ['brasileira', 'brasileiro', 'brasil', 'brasileirao', 'brasileirão'], id: 9 },
      { keywords: ['champions', 'champions league', 'liga dos campeoes', 'liga dos campeões'], id: 7 },
      { keywords: ['europa league', 'liga europa'], id: 8 }
    ];

    const lowerQuery = query.toLowerCase().trim();
    const matchedAliasIds = LEAGUE_ALIASES
      .filter(alias => alias.keywords.some(keyword => lowerQuery.includes(keyword)))
      .map(alias => alias.id);

    // 1. Pesquisar Ligas
    let resolvedLeagues: any[] = [];
    
    // Se houver correspondência com aliases, procurar primeiro por esses IDs
    if (matchedAliasIds.length > 0) {
      const { data: aliasLeagues } = await supabase
        .from('leagues')
        .select('id, name, country, logo_url')
        .in('id', matchedAliasIds);
      if (aliasLeagues) {
        resolvedLeagues.push(...aliasLeagues);
      }
    }

    // Fazer a pesquisa normal para encontrar outras ligas
    const { data: searchedLeagues } = await supabase
      .from('leagues')
      .select('id, name, country, logo_url')
      .or(`name.ilike.%${query}%,country.ilike.%${query}%`)
      .limit(10);

    if (searchedLeagues) {
      searchedLeagues.forEach(l => {
        if (!resolvedLeagues.some(rl => rl.id === l.id)) {
          resolvedLeagues.push(l);
        }
      });
    }

    const finalLeagues = resolvedLeagues.slice(0, 5);

    // IDs de equipas duplicadas ou não-funcionais (e.g. equipas de testes ou duplicados femininos/secundários sem dados suficientes)
    const EXCLUDED_TEAM_IDS = [999991, 999992, 999993, 999994, 926, 913, 924, 911, 843, 889, 767, 1328]

    // 2. Pesquisar Equipas
    const { data: rawTeams } = await supabase
      .from('teams')
      .select('id, name, short_name, logo_url')
      .or(`name.ilike.%${query}%,short_name.ilike.%${query}%`)
      .limit(20)

    const filteredTeams = (rawTeams || [])
      .filter((team) => !EXCLUDED_TEAM_IDS.includes(team.id))
      .slice(0, 5)

    // 3. Pesquisar Jogadores (Perfis Públicos)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, points, first_name, last_name, username')
      .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(5)

    // Resolver a classificação de cada jogador na tabela classificativa geral
    const resolvedPlayers = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt('points', profile.points)

        const fName = profile.first_name || ''
        const lName = profile.last_name || ''
        const fullName = [fName, lName].filter(Boolean).join(' ')

        return {
          id: profile.id,
          email: maskEmail(profile.email),
          name: profile.username || fullName || maskEmail(profile.email),
          points: profile.points / 100,
          rank: (count || 0) + 1,
        }
      })
    )

    return NextResponse.json({
      leagues: finalLeagues,
      teams: filteredTeams,
      players: resolvedPlayers,
    })
  } catch (error: any) {
    console.error('Erro na pesquisa:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno na pesquisa' },
      { status: 500 }
    )
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return 'utilizador'
  if (local.length <= 3) {
    return `${local.substring(0, 1)}***@${domain}`
  }
  return `${local.substring(0, 3)}***@${domain}`
}
