import { NextResponse } from 'next/server'
import { statsSyncService } from '@/services/statsSync'
import { validateSyncSecret } from '@/utils/syncAuth'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const leagueIdParam = searchParams.get('league_id')

    const unauthorizedResponse = validateSyncSecret(request)
    if (unauthorizedResponse) return unauthorizedResponse

    const leagueId = leagueIdParam ? Number(leagueIdParam) : undefined
    const result = await statsSyncService.syncPlayerStats(leagueId)

    return NextResponse.json({
      success: true,
      message: 'Sincronização de estatísticas de jogadores concluída com sucesso!',
      data: result,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor.'
    console.error('Erro na sincronização de estatísticas:', error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
