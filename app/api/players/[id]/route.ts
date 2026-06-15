import { createAdminClient } from '@/utils/supabase/admin'
import { bzzoiroService } from '@/services/bzzoiro'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params

  if (!userId) {
    return NextResponse.json({ error: 'ID do utilizador em falta' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // 1. Procurar Perfil do Utilizador
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, points, updated_at, first_name, last_name, username')
      .eq('id', userId)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Jogador não encontrado' }, { status: 404 })
    }

    // 2. Calcular a classificação geral (rank)
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gt('points', profile.points)

    const rank = (count || 0) + 1

    // 3. Obter Histórico de Prognósticos do Utilizador (últimos 5)
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    // Helper para mapear prognósticos
    const getPredictionText = (predictedOutcome: string, homeTeam: string, awayTeam: string) => {
      let outcome = predictedOutcome
      let betAmount = 0
      if (predictedOutcome.includes(':bet=')) {
        const parts = predictedOutcome.split(':')
        outcome = parts[0]
        const betPart = parts.find(p => p.startsWith('bet='))
        if (betPart) betAmount = Number(betPart.split('=')[1]) || 0
      }

      let text = ''
      if (outcome === '1') text = `Vitória de ${homeTeam}`
      else if (outcome === '2') text = `Vitória de ${awayTeam}`
      else if (outcome === 'X') text = 'Empate (X)'
      else if (outcome === 'OVER_25') text = 'Golos (Mais 2.5)'
      else if (outcome === 'UNDER_25') text = 'Golos (Menos 2.5)'
      else if (outcome === 'BTTS_YES') text = 'Ambas Equipas Marcam (Sim)'
      else if (outcome === 'BTTS_NO') text = 'Ambas Equipas Marcam (Não)'

      if (betAmount > 0) {
        text += ` [Aposta: ${betAmount.toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} PTS]`
      }
      return text
    }

    const resolvedPredictions = await Promise.all(
      (predictions || []).map(async (pred) => {
        try {
          const match = await bzzoiroService.getEventDetails(Number(pred.match_id))

          return {
            id: pred.id,
            matchId: pred.match_id,
            homeTeam: match.home_team.name,
            awayTeam: match.away_team.name,
            homeLogo: match.home_team.logo,
            awayLogo: match.away_team.logo,
            status: match.status,
            scoreHome: match.score.home,
            scoreAway: match.score.away,
            predictedOutcome: pred.predicted_outcome,
            predictedOutcomeText: getPredictionText(pred.predicted_outcome, match.home_team.name, match.away_team.name),
            isCalculated: pred.is_calculated,
            pointsAwarded: pred.points_awarded / 100,
            date: match.date,
          }
        } catch (err) {
          return {
            id: pred.id,
            matchId: pred.match_id,
            homeTeam: `Jogo #${pred.match_id}`,
            awayTeam: '',
            homeLogo: null,
            awayLogo: null,
            status: 'N/A',
            scoreHome: null,
            scoreAway: null,
            predictedOutcome: pred.predicted_outcome,
            predictedOutcomeText: getPredictionText(pred.predicted_outcome, `Jogo #${pred.match_id}`, ''),
            isCalculated: pred.is_calculated,
            pointsAwarded: pred.points_awarded / 100,
            date: pred.created_at,
          }
        }
      })
    )

    const fName = profile.first_name || ''
    const lName = profile.last_name || ''
    const fullName = [fName, lName].filter(Boolean).join(' ')

    return NextResponse.json({
      profile: {
        email: maskEmail(profile.email),
        name: profile.username || fullName || maskEmail(profile.email),
        points: profile.points / 100,
        rank,
        updatedAt: profile.updated_at,
      },
      predictions: resolvedPredictions,
    })
  } catch (error: any) {
    console.error('Erro ao obter detalhes do jogador:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar detalhes do jogador' },
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
