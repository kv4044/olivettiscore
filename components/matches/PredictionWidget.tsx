'use client'

import { useState, useTransition } from 'react'
import { submitPredictionAction } from '@/app/actions'
import { Award, AlertCircle, CheckCircle2 } from 'lucide-react'

interface PredictionWidgetProps {
  matchId: number;
  initialPrediction: '1' | 'X' | '2' | null;
  isMatchStarted: boolean;
  homeTeamName: string;
  awayTeamName: string;
  isCalculated: boolean;
  pointsAwarded: number;
}

export default function PredictionWidget({
  matchId,
  initialPrediction,
  isMatchStarted,
  homeTeamName,
  awayTeamName,
  isCalculated,
  pointsAwarded,
}: PredictionWidgetProps) {
  const [prediction, setPrediction] = useState<'1' | 'X' | '2' | null>(initialPrediction)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const handlePredict = (outcome: '1' | 'X' | '2') => {
    if (isMatchStarted || isPending) return

    startTransition(async () => {
      setMessage(null)
      const res = await submitPredictionAction(matchId, outcome)
      if (res?.success) {
        setPrediction(outcome)
        setMessage({ type: 'success', text: res.message })
      } else {
        setMessage({ type: 'error', text: res?.message || 'Erro ao submeter prognóstico.' })
      }
    })
  }

  // Cores de Destaque
  const getButtonClass = (btnType: '1' | 'X' | '2') => {
    const isSelected = prediction === btnType
    const base = 'flex-1 py-3.5 px-4 rounded-xl text-sm font-bold border transition-all duration-300 flex flex-col items-center justify-center gap-1 cursor-pointer '

    if (isMatchStarted) {
      if (isSelected) {
        return base + 'bg-zinc-800 border-zinc-700 text-zinc-400 opacity-90 cursor-not-allowed'
      }
      return base + 'bg-zinc-950/20 border-zinc-900 text-zinc-600 cursor-not-allowed'
    }

    if (isSelected) {
      return base + 'bg-gradient-to-tr from-indigo-500 to-purple-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20 active:scale-95'
    }

    return base + 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:bg-zinc-900 active:scale-95'
  }

  return (
    <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 shadow-xl w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
          Jogo de Prognósticos
        </h3>
        {isCalculated ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <Award className="w-3.5 h-3.5" />
            <span>+{pointsAwarded} Pontos</span>
          </span>
        ) : isMatchStarted ? (
          <span className="text-xs text-zinc-500 font-medium bg-zinc-950 border border-zinc-900 px-2.5 py-1 rounded-full">
            Jogo Iniciado
          </span>
        ) : (
          <span className="text-xs text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-1 rounded-full">
            Aberto
          </span>
        )}
      </div>

      <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
        {isMatchStarted 
          ? 'Os prognósticos estão encerrados para este jogo. Acompanha o resultado para ver se somas pontos!'
          : 'Quem ganha esta partida? Clica no teu palpite para submeter o prognóstico antes do início do jogo.'}
      </p>

      {/* Botões do Jogo de Prognósticos */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => handlePredict('1')}
          disabled={isMatchStarted || isPending}
          className={getButtonClass('1')}
        >
          <span className="text-xs text-zinc-500 font-normal uppercase tracking-wider">Casa</span>
          <span className="truncate max-w-[100px]">{homeTeamName.split(' ')[0]}</span>
        </button>

        <button
          onClick={() => handlePredict('X')}
          disabled={isMatchStarted || isPending}
          className={getButtonClass('X')}
        >
          <span className="text-xs text-zinc-500 font-normal uppercase tracking-wider">Empate</span>
          <span>X</span>
        </button>

        <button
          onClick={() => handlePredict('2')}
          disabled={isMatchStarted || isPending}
          className={getButtonClass('2')}
        >
          <span className="text-xs text-zinc-500 font-normal uppercase tracking-wider">Fora</span>
          <span className="truncate max-w-[100px]">{awayTeamName.split(' ')[0]}</span>
        </button>
      </div>

      {/* Feedback Messages */}
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

      {/* Se o jogo já acabou e o palpite foi correto/incorreto */}
      {isCalculated && (
        <div className="border-t border-zinc-800/80 mt-5 pt-4 text-center">
          {pointsAwarded > 0 ? (
            <p className="text-xs font-semibold text-emerald-400">
              🎉 Parabéns! Acertaste no prognóstico e somaste 5 Pontos Olivetti.
            </p>
          ) : (
            <p className="text-xs text-zinc-500">
              Ups! O resultado foi diferente do teu prognóstico. Tenta novamente no próximo jogo!
            </p>
          )}
        </div>
      )}
    </div>
  )
}
