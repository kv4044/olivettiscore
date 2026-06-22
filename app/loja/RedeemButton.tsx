'use client'

import { useActionState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { redeemReward, RedeemState } from './actions'

const initialState: RedeemState = {
  success: false,
  message: '',
}

interface RedeemButtonProps {
  rewardId: string
  canAfford: boolean
  alreadyRedeemed: boolean
}

export default function RedeemButton({ rewardId, canAfford, alreadyRedeemed }: RedeemButtonProps) {
  const redeemRewardWithId = redeemReward.bind(null, rewardId)
  const [state, formAction, isPending] = useActionState(redeemRewardWithId, initialState)
  const disabled = isPending || !canAfford || alreadyRedeemed

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <button
        type="submit"
        disabled={disabled}
        title={alreadyRedeemed ? 'Já resgataste este prémio' : canAfford ? 'Resgatar este prémio' : 'Não tens pontos suficientes'}
        className="flex items-center gap-1.5 rounded-xl border border-indigo-400/30 bg-indigo-500 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-all hover:bg-indigo-400 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900/70 disabled:text-zinc-500"
      >
        <ShoppingCart className="h-3 w-3" />
        {isPending ? 'A resgatar...' : alreadyRedeemed ? 'Resgatado' : 'Resgatar'}
      </button>
      {!canAfford && !alreadyRedeemed && !state.message && (
        <span className="text-right text-[9px] font-semibold text-zinc-500">Pontos insuficientes</span>
      )}
      {state.message && (
        <span
          aria-live="polite"
          className={`max-w-48 text-right text-[9px] font-semibold ${state.success ? 'text-emerald-400' : 'text-red-400'}`}
        >
          {state.message}
        </span>
      )}
    </form>
  )
}
