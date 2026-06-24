import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { predictionsService } from '@/services/predictions'
import { validateSyncSecret } from '@/utils/syncAuth'

export async function GET(request: Request) {
  try {
    const unauthorizedResponse = validateSyncSecret(request)
    if (unauthorizedResponse) return unauthorizedResponse

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
