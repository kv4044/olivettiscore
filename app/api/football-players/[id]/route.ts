import { createAdminClient } from '@/utils/supabase/admin'
import { bzzoiroService } from '@/services/bzzoiro'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const playerId = Number(id)

  if (isNaN(playerId)) {
    return NextResponse.json({ error: 'ID do jogador inválido' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // 1. Obter estatísticas do jogador de futebol da base de dados
    const { data: statsData, error: statsError } = await supabase
      .from('player_stats')
      .select('player_name, goals, assists, passes, yellow_cards, red_cards, position, team_id, teams(name, logo_url)')
      .eq('player_id', playerId)

    if (statsError) {
      console.error('Erro ao obter estatísticas da DB:', statsError)
    }

    let goals = 0
    let assists = 0
    let passes = 0
    let yellow_cards = 0
    let red_cards = 0
    let teamName = ''
    let teamLogo = ''
    let position = ''
    let teamId = null

    if (statsData && statsData.length > 0) {
      statsData.forEach(row => {
        goals += row.goals || 0
        assists += row.assists || 0
        passes += row.passes || 0
        yellow_cards += row.yellow_cards || 0
        red_cards += row.red_cards || 0
        const teamObj = Array.isArray(row.teams) ? row.teams[0] : row.teams
        if (teamObj?.name) {
          teamName = teamObj.name
          teamLogo = teamObj.logo_url || ''
        }
        if (row.position) {
          position = row.position
        }
        if (row.team_id) {
          teamId = row.team_id
        }
      })
    }

    // 2. Obter detalhes adicionais do jogador de futebol a partir da API Bzzoiro
    let apiDetails: any = null
    try {
      apiDetails = await bzzoiroService.getPlayerDetails(playerId)
    } catch (apiErr) {
      console.error('Erro ao chamar API Bzzoiro para detalhes do jogador:', apiErr)
    }

    // Se não tivermos dados da equipa da DB, tentar obter da API
    if (!teamName && apiDetails?.current_team_id) {
      teamId = apiDetails.current_team_id
      try {
        const teamDetails = await bzzoiroService.getTeamDetails(apiDetails.current_team_id)
        teamName = teamDetails?.name || 'Equipa Desconhecida'
      } catch (err) {
        console.error('Erro ao obter detalhes da equipa pela API:', err)
      }
    }

    return NextResponse.json({
      id: playerId,
      name: apiDetails?.name || statsData?.[0]?.player_name || `Jogador #${playerId}`,
      shortName: apiDetails?.short_name || null,
      nationality: apiDetails?.nationality || 'Nacionalidade desconhecida',
      dateOfBirth: apiDetails?.date_of_birth || null,
      heightCm: apiDetails?.height_cm || null,
      weightKg: apiDetails?.weight_kg || null,
      preferredFoot: apiDetails?.preferred_foot || null,
      marketValueEur: apiDetails?.market_value_eur || null,
      contractUntil: apiDetails?.contract_until || null,
      jerseyNumber: apiDetails?.jersey_number || null,
      position: position || apiDetails?.position || 'M',
      specificPosition: apiDetails?.specific_position || null,
      attributes: apiDetails?.attributes || null,
      stats: {
        goals,
        assists,
        passes,
        yellowCards: yellow_cards,
        redCards: red_cards,
      },
      team: {
        id: teamId,
        name: teamName,
        logoUrl: teamLogo,
      }
    })
  } catch (error: any) {
    console.error('Erro geral ao obter dados do jogador de futebol:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar dados do jogador de futebol' },
      { status: 500 }
    )
  }
}
