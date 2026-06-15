'use server'

import { revalidatePath } from 'next/cache'
import { favoritesService } from '@/services/favorites'
import { predictionsService } from '@/services/predictions'

/**
 * Ação de Servidor para favoritar/desfavoritar uma liga.
 */
export async function toggleFavoriteLeagueAction(leagueId: number, name: string, country?: string) {
  try {
    const res = await favoritesService.toggleLeague(leagueId, name, country)
    revalidatePath('/')
    revalidatePath(`/jogo/${leagueId}`) // Caso influencie
    return { success: true, favorited: res.favorited }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao favoritar liga.' }
  }
}

/**
 * Ação de Servidor para favoritar/desfavoritar uma equipa.
 */
export async function toggleFavoriteTeamAction(teamId: number, name: string) {
  try {
    const res = await favoritesService.toggleTeam(teamId, name)
    revalidatePath('/')
    return { success: true, favorited: res.favorited }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao favoritar equipa.' }
  }
}

/**
 * Ação de Servidor para favoritar/desfavoritar um jogo.
 */
export async function toggleFavoriteMatchAction(matchId: number) {
  try {
    const res = await favoritesService.toggleMatch(matchId)
    revalidatePath('/')
    revalidatePath(`/jogo/${matchId}`)
    return { success: true, favorited: res.favorited }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao favoritar jogo.' }
  }
}

/**
 * Ação de Servidor para submeter prognóstico.
 */
export async function submitPredictionAction(matchId: number, outcome: '1' | 'X' | '2') {
  try {
    const res = await predictionsService.submitPrediction(matchId, outcome)
    revalidatePath(`/jogo/${matchId}`)
    revalidatePath('/dashboard')
    return res
  } catch (error: any) {
    return { success: false, message: error.message || 'Erro ao submeter prognóstico.' }
  }
}

/**
 * Ação de Servidor para submeter aposta de pontos.
 */
export async function submitBetAction(matchId: number, outcome: '1' | 'X' | '2' | 'OVER_25' | 'UNDER_25' | 'BTTS_YES' | 'BTTS_NO', betAmount: number, odd: number) {
  try {
    const res = await predictionsService.submitBet(matchId, outcome, betAmount, odd)
    revalidatePath(`/jogo/${matchId}`)
    revalidatePath('/dashboard')
    return res
  } catch (error: any) {
    return { success: false, message: error.message || 'Erro ao submeter aposta.' }
  }
}
