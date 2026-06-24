import { NextResponse } from 'next/server'
import { bzzoiroSyncService } from '@/services/bzzoiroSync'
import { validateSyncSecret } from '@/utils/syncAuth'

export async function GET(request: Request) {
  try {
    const unauthorizedResponse = validateSyncSecret(request)
    if (unauthorizedResponse) return unauthorizedResponse

    const result = await bzzoiroSyncService.syncLeaguesAndTeams()

    return NextResponse.json({
      success: true,
      message: 'Sincronização concluída com sucesso!',
      data: result,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor.'
    console.error('Erro na sincronização Bzzoiro:', error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
