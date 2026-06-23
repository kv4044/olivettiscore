import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { predictionsService } from '@/services/predictions'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secretParam = searchParams.get('secret')
    const syncSecret = process.env.SYNC_SECRET

    // Em produção, exige-se validação de secret para segurança
    if (process.env.NODE_ENV === 'production' && syncSecret && secretParam !== syncSecret) {
      return NextResponse.json(
        { error: 'Não autorizado. Forneça o secret correto (?secret=...)' },
        { status: 401 }
      )
    }

    const result = await predictionsService.calculatePredictions()
    revalidatePath('/dashboard')
    revalidatePath('/jogo/[id]', 'page')

    return NextResponse.json({
      success: true,
      message: 'Cálculo de prognósticos concluído com sucesso!',
      data: result,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor.'
    console.error('Erro ao calcular prognósticos:', error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
