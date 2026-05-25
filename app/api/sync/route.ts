import { NextResponse } from 'next/server'
import { bzzoiroSyncService } from '@/services/bzzoiroSync'

export async function GET(request: Request) {
  try {
    // Segurança básica em produção:
    // Se SYNC_SECRET estiver definido nas variáveis de ambiente, valida-se o parâmetro ?secret=...
    const { searchParams } = new URL(request.url)
    const secretParam = searchParams.get('secret')
    const syncSecret = process.env.SYNC_SECRET

    if (process.env.NODE_ENV === 'production' && syncSecret && secretParam !== syncSecret) {
      return NextResponse.json(
        { error: 'Não autorizado. Forneça o secret de sincronização correto (?secret=...)' },
        { status: 401 }
      )
    }

    const result = await bzzoiroSyncService.syncLeaguesAndTeams()

    return NextResponse.json({
      success: true,
      message: 'Sincronização concluída com sucesso!',
      data: result,
    })
  } catch (error: any) {
    console.error('Erro na sincronização Bzzoiro:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
