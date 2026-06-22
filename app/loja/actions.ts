'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { rewardIds } from './rewards'

export type RedeemState = {
  success: boolean
  message: string
}

export async function redeemReward(
  rewardId: string,
  _previousState: RedeemState,
  _formData: FormData,
): Promise<RedeemState> {
  void _previousState
  void _formData

  if (!rewardIds.has(rewardId)) {
    return { success: false, message: 'O prémio selecionado não é válido.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'Inicia sessão para resgatar prémios.' }
  }

  const { error } = await supabase.rpc('redeem_point_reward', {
    p_reward_id: rewardId,
  })

  if (error) {
    if (error.code === 'PGRST202') {
      return {
        success: false,
        message: 'A loja ainda não está configurada na base de dados.',
      }
    }

    return {
      success: false,
      message: error.message || 'Não foi possível resgatar o prémio.',
    }
  }

  revalidatePath('/')
  revalidatePath('/loja')
  revalidatePath('/dashboard')

  return {
    success: true,
    message: 'Prémio resgatado com sucesso! O pedido ficou registado.',
  }
}
