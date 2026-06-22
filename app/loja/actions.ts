'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { sendRewardRedemptionEmail } from '@/services/email'
import { rewards } from './rewards'

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

  const reward = rewards.find((item) => item.id === rewardId)

  if (!reward) {
    return { success: false, message: 'O prémio selecionado não é válido.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'Inicia sessão para resgatar prémios.' }
  }

  const { data, error } = await supabase.rpc('redeem_point_reward', {
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

  const rpcResult = Array.isArray(data) ? data[0] : undefined
  const email = user.email
    ? await sendRewardRedemptionEmail({
        to: user.email,
        firstName: user.user_metadata?.first_name,
        rewardName: reward.name,
        pointsSpent: reward.price,
        remainingPoints: (rpcResult?.remaining_points || 0) / 100,
        redemptionId: rpcResult?.redemption_id,
      })
    : { success: false, error: 'O utilizador não tem um endereço de e-mail.' }

  if (!email.success) {
    console.error('O resgate foi concluído, mas o e-mail não foi enviado:', email.error)
    return {
      success: true,
      message: 'Prémio resgatado, mas não foi possível enviar o e-mail de confirmação.',
    }
  }

  return {
    success: true,
    message: 'Prémio resgatado! Enviámos uma confirmação para o teu e-mail.',
  }
}
