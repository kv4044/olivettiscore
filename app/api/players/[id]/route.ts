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
      .select('email, points, updated_at')
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

    const resolvedPredictions = await Promise.all(
      (predictions || []).map(async (pred) => {
        try {
          const match = await bzzoiroService.getEventDetails(Number(pred.match_id))

          // Mapear resultado predito
          let predOutcomeText = ''
          if (pred.predicted_outcome === '1') predOutcomeText = `Vitória de ${match.home_team.name}`
          else if (pred.predicted_outcome === '2') predOutcomeText = `Vitória de ${match.away_team.name}`
          else predOutcomeText = 'Empate (X)'

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
            predictedOutcomeText: predOutcomeText,
            isCalculated: pred.is_calculated,
            pointsAwarded: pred.points_awarded,
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
            predictedOutcomeText: pred.predicted_outcome === '1' ? 'Casa' : pred.predicted_outcome === '2' ? 'Fora' : 'Empate',
            isCalculated: pred.is_calculated,
            pointsAwarded: pred.points_awarded,
            date: pred.created_at,
          }
        }
      })
    )

    return NextResponse.json({
      profile: {
        email: maskEmail(profile.email),
        points: profile.points,
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
