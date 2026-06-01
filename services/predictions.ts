import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { bzzoiroService } from './bzzoiro'

export interface UserPrediction {
  id: string;
  user_id: string;
  match_id: number;
  predicted_outcome: '1' | 'X' | '2';
  is_calculated: boolean;
  points_awarded: number;
  created_at: string;
}

export const predictionsService = {
  /**
   * Obtém a previsão de um utilizador para um jogo específico.
   */
  async getUserPredictionForMatch(matchId: number): Promise<UserPrediction | null> {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id)
        .eq('match_id', matchId)
        .maybeSingle()

      if (error) throw error
      return data as UserPrediction
    } catch (error) {
      console.error('Erro ao obter previsão do utilizador:', error)
      return null
    }
  },

  /**
   * Submete ou atualiza o prognóstico para um jogo.
   * Valida se o jogo ainda não começou para impedir submissões fora de tempo.
   */
  async submitPrediction(matchId: number, outcome: '1' | 'X' | '2'): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Utilizador não autenticado.')

    // 1. Obter o estado do jogo da API Bzzoiro para garantir que não começou
    let matchDetails
    try {
      matchDetails = await bzzoiroService.getEventDetails(matchId)
    } catch (err) {
      throw new Error('Não foi possível obter informações do jogo para validar o prognóstico.')
    }

    if (matchDetails.status !== 'NS') {
      return {
        success: false,
        message: 'Não é possível submeter prognósticos para jogos que já começaram ou terminaram.',
      }
    }

    // 2. Criar ou atualizar o prognóstico
    const { error } = await supabase
      .from('predictions')
      .upsert(
        {
          user_id: user.id,
          match_id: matchId,
          predicted_outcome: outcome,
          is_calculated: false,
          points_awarded: 0,
        },
        { onConflict: 'user_id,match_id' }
      )

    if (error) {
      console.error('Erro ao guardar prognóstico:', error)
      throw new Error(`Falha ao submeter prognóstico: ${error.message}`)
    }

    return {
      success: true,
      message: 'Prognóstico submetido com sucesso!',
    }
  },

  /**
   * Processa todos os prognósticos pendentes.
   * Procura previsões não calculadas, consulta o resultado do jogo correspondente na API
   * e atribui pontuações na tabela de perfis de utilizador.
   */
  async calculatePredictions(): Promise<{ processed: number; pointsAwarded: number }> {
    const adminSupabase = createAdminClient()

    // 1. Obter todas as previsões pendentes
    const { data: pendingPredictions, error: fetchErr } = await adminSupabase
      .from('predictions')
      .select('*')
      .eq('is_calculated', false)

    if (fetchErr) {
      throw new Error(`Erro ao obter prognósticos pendentes: ${fetchErr.message}`)
    }

    if (!pendingPredictions || pendingPredictions.length === 0) {
      return { processed: 0, pointsAwarded: 0 }
    }

    let processed = 0
    let pointsAwardedTotal = 0

    // Agrupar previsões por jogo para evitar chamadas de API repetidas para o mesmo jogo
    const predictionsByMatch = new Map<number, typeof pendingPredictions>()
    pendingPredictions.forEach((pred) => {
      const list = predictionsByMatch.get(pred.match_id) || []
      list.push(pred)
      predictionsByMatch.set(pred.match_id, list)
    })

    // 2. Verificar os resultados de cada jogo e calcular pontos
    for (const [matchId, preds] of predictionsByMatch.entries()) {
      try {
        const match = await bzzoiroService.getEventDetails(matchId)

        // Apenas processar se o jogo terminou
        if (match.status === 'FT') {
          const homeScore = match.score.home
          const awayScore = match.score.away

          if (homeScore === null || awayScore === null) {
            // Resultado inválido na API, saltar
            continue
          }

          // Determinar resultado real
          let realOutcome: '1' | 'X' | '2'
          if (homeScore > awayScore) {
            realOutcome = '1'
          } else if (homeScore < awayScore) {
            realOutcome = '2'
          } else {
            realOutcome = 'X'
          }

          // Atribuir pontos a cada utilizador
          for (const pred of preds) {
            const isCorrect = pred.predicted_outcome === realOutcome
            const pointsToAward = isCorrect ? 5 : 0

            // Iniciar transação/atualização individual
            // 2.1 Atualizar o registo da previsão
            const { error: updatePredErr } = await adminSupabase
              .from('predictions')
              .update({
                is_calculated: true,
                points_awarded: pointsToAward,
              })
              .eq('id', pred.id)

            if (updatePredErr) {
              console.error(`Erro ao atualizar previsão ${pred.id}:`, updatePredErr)
              continue
            }

            // 2.2 Se o utilizador acertou, somar os pontos no perfil do utilizador
            if (pointsToAward > 0) {
              // Obter pontos atuais do utilizador
              const { data: profile, error: profileErr } = await adminSupabase
                .from('profiles')
                .select('points')
                .eq('id', pred.user_id)
                .maybeSingle()

              if (profileErr) {
                console.error(`Erro ao obter perfil do utilizador ${pred.user_id}:`, profileErr)
                continue
              }

              const currentPoints = profile?.points || 0
              const newPoints = currentPoints + pointsToAward

              const { error: updateProfileErr } = await adminSupabase
                .from('profiles')
                .update({
                  points: newPoints,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', pred.user_id)

              if (updateProfileErr) {
                console.error(`Erro ao atualizar pontos do utilizador ${pred.user_id}:`, updateProfileErr)
              } else {
                pointsAwardedTotal += pointsToAward
              }
            }

            processed++
          }
        }
      } catch (err: any) {
        console.error(`Erro ao processar previsões do jogo #${matchId}:`, err.message || err)
      }
    }

    return { processed, pointsAwarded: pointsAwardedTotal }
  },
}
