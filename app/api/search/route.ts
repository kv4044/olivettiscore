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

    // 1. Pesquisar Ligas (por nome ou país)
    const { data: leagues } = await supabase
      .from('leagues')
      .select('id, name, country, logo_url')
      .or(`name.ilike.%${query}%,country.ilike.%${query}%`)
      .limit(5)

    // 2. Pesquisar Equipas
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, short_name, logo_url')
      .or(`name.ilike.%${query}%,short_name.ilike.%${query}%`)
      .limit(5)

    // 3. Pesquisar Jogadores (Perfis Públicos)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, points, first_name, last_name')
      .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
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
          name: fullName || maskEmail(profile.email),
          points: profile.points,
          rank: (count || 0) + 1,
        }
      })
    )

    return NextResponse.json({
      leagues: leagues || [],
      teams: teams || [],
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
