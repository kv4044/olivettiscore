import { NextResponse } from 'next/server'
import { statsSyncService } from '@/services/statsSync'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secretParam = searchParams.get('secret')
    const leagueIdParam = searchParams.get('league_id')
    const syncSecret = process.env.SYNC_SECRET

    // basic authorization in production
    if (process.env.NODE_ENV === 'production' && syncSecret && secretParam !== syncSecret) {
      return NextResponse.json(
        { error: 'Não autorizado. Forneça o secret de sincronização correto (?secret=...)' },
        { status: 401 }
      )
    }

    const leagueId = leagueIdParam ? Number(leagueIdParam) : undefined
    const result = await statsSyncService.syncPlayerStats(leagueId)

    return NextResponse.json({
      success: true,
      message: 'Sincronização de estatísticas de jogadores concluída com sucesso!',
      data: result,
    })
  } catch (error: any) {
    console.error('Erro na sincronização de estatísticas:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
