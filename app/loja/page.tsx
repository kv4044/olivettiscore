import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Coins, Gift, ShoppingBag, Sparkles } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import RedeemButton from './RedeemButton'
import { rewards } from './rewards'

export const revalidate = 0

export default async function PointsStorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: profile }, { data: redemptions }] = await Promise.all([
    supabase
      .from('profiles')
      .select('points')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('reward_redemptions')
      .select('reward_id')
      .eq('user_id', user.id),
  ])

  const userPoints = (profile?.points || 0) / 100
  const redeemedRewardIds = new Set((redemptions || []).map((redemption) => redemption.reward_id))

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-zinc-950 to-black text-zinc-100">
      <div className="absolute left-1/4 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 h-96 w-96 translate-x-1/2 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/70 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              aria-label="Voltar ao menu principal"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-300 transition-all hover:border-zinc-700 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-base font-extrabold leading-none">Loja de Pontos</h1>
              <p className="mt-1 text-[10px] text-zinc-500">Troca os teus pontos por recompensas</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5">
            <Coins className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-bold text-indigo-300">
              {userPoints.toLocaleString('pt-PT', { maximumFractionDigits: 2 })} Pontos
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 py-10 md:px-8">
        <section className="mb-10 overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/50 to-purple-950/20 p-7 shadow-xl md:p-10">
          <div className="flex max-w-2xl flex-col items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Recompensas Olivetti</p>
              <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl">Os teus pontos valem prémios.</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Continua a fazer bons prognósticos para aumentar o saldo e desbloquear novas recompensas.
              </p>
            </div>
          </div>
        </section>

        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-300">
            <Gift className="h-4 w-4 text-indigo-400" />
            Recompensas
          </h2>
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            Disponíveis
          </span>
        </div>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {rewards.map((reward) => (
            <article
              key={reward.name}
              className={`relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br ${reward.accent} p-6`}
            >
              <Sparkles className="mb-8 h-7 w-7 text-white/70" />
              <h3 className="text-base font-extrabold text-white">{reward.name}</h3>
              <p className="mt-2 min-h-10 text-xs leading-5 text-zinc-400">{reward.description}</p>
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="flex items-center gap-1.5 text-sm font-black text-white">
                  <Coins className="h-4 w-4 text-indigo-400" />
                  {reward.price} Pontos
                </span>
                <RedeemButton
                  rewardId={reward.id}
                  canAfford={userPoints >= reward.price}
                  alreadyRedeemed={redeemedRewardIds.has(reward.id)}
                />
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}
