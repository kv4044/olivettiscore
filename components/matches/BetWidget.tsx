'use client'

import { useState, useTransition } from 'react'
import { submitBetAction } from '@/app/actions'
import { Award, AlertCircle, CheckCircle2, TrendingUp, Coins } from 'lucide-react'

interface BetWidgetProps {
  matchId: number;
  homeTeamName: string;
  awayTeamName: string;
  isMatchStarted: boolean;
  odds: any;
  userPoints: number;
  initialOutcome: '1' | 'X' | '2' | 'OVER_25' | 'UNDER_25' | 'BTTS_YES' | 'BTTS_NO' | null;
  initialBetAmount: number;
  initialBetOdd: number;
  isCalculated: boolean;
  pointsAwarded: number;
}

export default function BetWidget({
  matchId,
  homeTeamName,
  awayTeamName,
  isMatchStarted,
  odds,
  userPoints,
  initialOutcome,
  initialBetAmount,
  initialBetOdd,
  isCalculated,
  pointsAwarded,
}: BetWidgetProps) {
  const [outcome, setOutcome] = useState<'1' | 'X' | '2' | 'OVER_25' | 'UNDER_25' | 'BTTS_YES' | 'BTTS_NO' | null>(initialOutcome)
  const [betAmount, setBetAmount] = useState<string>(initialBetAmount > 0 ? String(initialBetAmount) : '')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const hasOdds = odds && (odds.home_win || odds.draw || odds.away_win)
  const odd1 = odds?.home_win ? Number(odds.home_win) : null
  const oddX = odds?.draw ? Number(odds.draw) : null
  const odd2 = odds?.away_win ? Number(odds.away_win) : null
  const oddOver = odds?.over_25_goals ? Number(odds.over_25_goals) : null
  const oddUnder = odds?.under_25_goals ? Number(odds.under_25_goals) : null
  const oddBttsYes = odds?.btts_yes ? Number(odds.btts_yes) : null
  const oddBttsNo = odds?.btts_no ? Number(odds.btts_no) : null

  const getSelectedOdd = () => {
    if (outcome === '1') return odd1
    if (outcome === 'X') return oddX
    if (outcome === '2') return odd2
    if (outcome === 'OVER_25') return oddOver
    if (outcome === 'UNDER_25') return oddUnder
    if (outcome === 'BTTS_YES') return oddBttsYes
    if (outcome === 'BTTS_NO') return oddBttsNo
    return null
  }

  const selectedOdd = getSelectedOdd()
  const parsedBetAmount = Number(betAmount) || 0
  const potentialWinnings = selectedOdd ? Math.round(parsedBetAmount * selectedOdd) : 0

  const handleBetSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isMatchStarted || isPending || !outcome || !selectedOdd) return

    if (parsedBetAmount <= 0) {
      setMessage({ type: 'error', text: 'Insere uma quantidade de pontos válida maior que zero.' })
      return
    }

    // Aposta precisa de pontos suficientes
    const pointsNeeded = parsedBetAmount - initialBetAmount
    if (userPoints < pointsNeeded) {
      setMessage({
        type: 'error',
        text: `Pontos insuficientes no teu saldo. Tens ${userPoints} pontos, mas precisas de ${parsedBetAmount} para esta aposta.`
      })
      return
    }

    startTransition(async () => {
      setMessage(null)
      const res = await submitBetAction(matchId, outcome, parsedBetAmount, selectedOdd)
      if (res?.success) {
        setMessage({ type: 'success', text: res.message })
      } else {
        setMessage({ type: 'error', text: res?.message || 'Erro ao submeter aposta.' })
      }
    })
  }

  // Helper de estilos de botões
  const getButtonClass = (btnType: '1' | 'X' | '2' | 'OVER_25' | 'UNDER_25' | 'BTTS_YES' | 'BTTS_NO') => {
    const isSelected = outcome === btnType
    const base = 'flex-1 py-3 px-3 rounded-xl text-xs font-bold border transition-all duration-300 cursor-pointer '

    if (isMatchStarted) {
      if (isSelected) {
        return base + 'bg-zinc-800 border-zinc-700 text-zinc-400 opacity-90 cursor-not-allowed'
      }
      return base + 'bg-zinc-950/20 border-zinc-900 text-zinc-650 cursor-not-allowed'
    }

    if (isSelected) {
      return base + 'bg-gradient-to-tr from-amber-500 to-orange-600 border-amber-400 text-white shadow-lg shadow-amber-500/20 active:scale-95'
    }

    return base + 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-350 hover:bg-zinc-900 active:scale-95'
  }

  return (
    <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 shadow-xl w-full max-w-md mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-amber-500" />
          <span>Aposta de Pontos</span>
        </h3>
        {isCalculated ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <Award className="w-3.5 h-3.5" />
            <span>+{pointsAwarded} Pontos</span>
          </span>
        ) : (
          <div className="flex items-center gap-1 bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-zinc-850 text-xxs font-bold text-zinc-400">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>Saldo: {userPoints} Pts</span>
          </div>
        )}
      </div>

      {!hasOdds ? (
        <div className="py-8 text-center text-zinc-550 text-xs border border-dashed border-zinc-800 rounded-2xl">
          Nenhuma odd disponível para este jogo no momento. Não é possível apostar pontos.
        </div>
      ) : (
        <form onSubmit={handleBetSubmit} className="space-y-5">
          {/* Seletor de Seleção (Casa, Empate, Fora) */}
          <div className="space-y-2">
            <label className="text-xxs font-black text-zinc-550 uppercase tracking-widest pl-1">Resultado Final (1X2)</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOutcome('1')}
                disabled={isMatchStarted || isPending}
                className={getButtonClass('1') + 'flex flex-col items-center justify-center gap-1'}
              >
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-normal">Casa</span>
                <span className="truncate max-w-[80px] font-black">{homeTeamName.split(' ')[0]}</span>
                {odd1 && <span className="text-[10px] font-mono text-zinc-400">@{odd1.toFixed(2)}</span>}
              </button>

              <button
                type="button"
                onClick={() => setOutcome('X')}
                disabled={isMatchStarted || isPending}
                className={getButtonClass('X') + 'flex flex-col items-center justify-center gap-1'}
              >
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-normal">Empate</span>
                <span className="font-black">X</span>
                {oddX && <span className="text-[10px] font-mono text-zinc-400">@{oddX.toFixed(2)}</span>}
              </button>

              <button
                type="button"
                onClick={() => setOutcome('2')}
                disabled={isMatchStarted || isPending}
                className={getButtonClass('2') + 'flex flex-col items-center justify-center gap-1'}
              >
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-normal">Fora</span>
                <span className="truncate max-w-[80px] font-black">{awayTeamName.split(' ')[0]}</span>
                {odd2 && <span className="text-[10px] font-mono text-zinc-400">@{odd2.toFixed(2)}</span>}
              </button>
            </div>
          </div>

          {/* Golos (Mais / Menos 2.5) */}
          {(oddOver || oddUnder) && (
            <div className="space-y-2">
              <label className="text-xxs font-black text-zinc-550 uppercase tracking-widest pl-1">Golos (Mais / Menos 2.5)</label>
              <div className="flex gap-2">
                {oddOver && (
                  <button
                    type="button"
                    onClick={() => setOutcome('OVER_25')}
                    disabled={isMatchStarted || isPending}
                    className={getButtonClass('OVER_25') + 'flex items-center justify-between px-3'}
                  >
                    <span className="text-[10px] uppercase tracking-wider font-black">Mais 2.5</span>
                    <span className={`text-xs font-mono font-bold ${outcome === 'OVER_25' ? 'text-white' : 'text-indigo-400'}`}>
                      {oddOver.toFixed(2)}
                    </span>
                  </button>
                )}
                {oddUnder && (
                  <button
                    type="button"
                    onClick={() => setOutcome('UNDER_25')}
                    disabled={isMatchStarted || isPending}
                    className={getButtonClass('UNDER_25') + 'flex items-center justify-between px-3'}
                  >
                    <span className="text-[10px] uppercase tracking-wider font-black">Menos 2.5</span>
                    <span className="text-xs font-mono font-bold text-zinc-400">
                      {oddUnder.toFixed(2)}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Ambas Equipas Marcam */}
          {(oddBttsYes || oddBttsNo) && (
            <div className="space-y-2">
              <label className="text-xxs font-black text-zinc-550 uppercase tracking-widest pl-1">Ambas Equipas Marcam</label>
              <div className="flex gap-2">
                {oddBttsYes && (
                  <button
                    type="button"
                    onClick={() => setOutcome('BTTS_YES')}
                    disabled={isMatchStarted || isPending}
                    className={getButtonClass('BTTS_YES') + 'flex items-center justify-between px-3'}
                  >
                    <span className="text-[10px] uppercase tracking-wider font-black">Sim</span>
                    <span className={`text-xs font-mono font-bold ${outcome === 'BTTS_YES' ? 'text-white' : 'text-emerald-400'}`}>
                      {oddBttsYes.toFixed(2)}
                    </span>
                  </button>
                )}
                {oddBttsNo && (
                  <button
                    type="button"
                    onClick={() => setOutcome('BTTS_NO')}
                    disabled={isMatchStarted || isPending}
                    className={getButtonClass('BTTS_NO') + 'flex items-center justify-between px-3'}
                  >
                    <span className="text-[10px] uppercase tracking-wider font-black">Não</span>
                    <span className="text-xs font-mono font-bold text-zinc-400">
                      {oddBttsNo.toFixed(2)}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Input de Quantidade de Pontos */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label htmlFor="betAmount" className="text-xxs font-black text-zinc-550 uppercase tracking-widest">
                Quantidade de Pontos a Apostar
              </label>
              {initialBetAmount > 0 && (
                <span className="text-[10px] text-zinc-500 font-semibold">
                  Aposta atual: <span className="text-amber-500 font-bold">{initialBetAmount} PTS</span>
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <Coins className="absolute left-3.5 w-4 h-4 text-zinc-500" />
              <input
                id="betAmount"
                type="number"
                min="1"
                max={userPoints + initialBetAmount}
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={isMatchStarted || isPending}
                placeholder="Insere a quantidade de pontos..."
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-zinc-800 bg-zinc-950/40 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 transition-all font-bold text-xs"
              />
            </div>
          </div>

          {/* Simulador de Retornos */}
          {outcome && selectedOdd && parsedBetAmount > 0 && (
            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-center justify-between text-xs animate-in slide-in-from-top-1 duration-200">
              <div className="space-y-0.5">
                <p className="text-zinc-500 font-semibold">Retorno Potencial se acertares:</p>
                <p className="text-[10px] text-zinc-650 font-mono">
                  {parsedBetAmount} PTS x odd @{selectedOdd.toFixed(2)}
                </p>
              </div>
              <span className="text-base font-black text-amber-400">
                {potentialWinnings} PTS
              </span>
            </div>
          )}

          {/* Botão de Submissão */}
          {!isMatchStarted && (
            <button
              type="submit"
              disabled={isPending || !outcome || parsedBetAmount <= 0}
              className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed text-white text-xs shadow-lg shadow-amber-500/10 cursor-pointer transition-all flex items-center justify-center gap-1.5"
            >
              {isPending ? 'A submeter aposta...' : 'Submeter Aposta de Pontos'}
            </button>
          )}

          {/* Feedback de Ações */}
          {message && (
            <div
              className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs leading-relaxed transition-all animate-in fade-in duration-300 ${
                message.type === 'success'
                  ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400'
                  : 'bg-red-500/5 border-red-500/10 text-red-400'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Se a aposta já foi resolvida */}
          {isCalculated && (
            <div className="border-t border-zinc-805 mt-4 pt-4 text-center">
              {pointsAwarded > 0 ? (
                <p className="text-xs font-bold text-emerald-400">
                  🎉 Excelente palpite! Acertaste na aposta e ganhaste {pointsAwarded} Pontos!
                </p>
              ) : (
                <p className="text-xs text-zinc-550">
                  A tua aposta não foi vencedora. Mais sorte no próximo mercado!
                </p>
              )}
            </div>
          )}
        </form>
      )}
    </div>
  )
}
