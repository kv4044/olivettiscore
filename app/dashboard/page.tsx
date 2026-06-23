import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { bzzoiroService } from '@/services/bzzoiro'
import { predictionsService } from '@/services/predictions'
import { 
  User, 
  Award, 
  Mail, 
  Calendar, 
  Trophy,
  History,
  TrendingUp,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  ReceiptText
} from 'lucide-react'
import RefreshButton from '@/components/RefreshButton'
import LeaderboardSection from '@/components/LeaderboardSection'
import PointTransactions, { PointTransaction } from '@/components/PointTransactions'
import { rewards } from '@/app/loja/rewards'

export const revalidate = 0 // Forçar renderização dinâmica para sempre mostrar dados atualizados

interface DashboardPageProps {
  searchParams: Promise<{
    tab?: string
  }>
}

// Helper para mascarar o e-mail no Leaderboard (por privacidade)
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return 'utilizador'
  if (local.length <= 3) {
    return `${local.substring(0, 1)}***@${domain}`
  }
  return `${local.substring(0, 3)}***@${domain}`
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams
  const activeTab = params.tab === 'transactions' ? 'transactions' : 'profile'

  // 1. Verificar Sessão do Utilizador
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  await predictionsService.calculatePredictions({ userId: user.id })

  // 2. Procurar Detalhes do Perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('points, first_name, last_name, birth_date, gender, username')
    .eq('id', user.id)
    .maybeSingle()

  const userPoints = (profile?.points || 0) / 100
  const firstName = profile?.first_name || user.user_metadata?.first_name || ''
  const lastName = profile?.last_name || user.user_metadata?.last_name || ''
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : ''
  const username = profile?.username || user.user_metadata?.username || ''
  const gender = profile?.gender || user.user_metadata?.gender || 'Não divulgado'
  const rawBirthDate = profile?.birth_date || user.user_metadata?.birth_date
  const formattedBirthDate = rawBirthDate
    ? new Date(rawBirthDate).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      })
    : 'Não especificada'

  // 3. Obter Classificação Geral (Leaderboard) - Top 10 utilizadores
  const { data: leaderboardData } = await supabase
    .from('profiles')
    .select('id, email, points, first_name, last_name, username')
    .order('points', { ascending: false })
    .limit(10)

  const leaderboard = (leaderboardData || []).map(row => ({
    ...row,
    points: row.points / 100
  }))

  // 4. Obter Histórico de Prognósticos Recentes (últimos 5)
  const { data: rawPredictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const predictions = rawPredictions || []

  // Helper para mapear prognósticos
  const getPredictionText = (predictedOutcome: string, homeTeam: string, awayTeam: string) => {
    let outcome = predictedOutcome
    let betAmount = 0
    if (predictedOutcome.includes(':bet=')) {
      const parts = predictedOutcome.split(':')
      outcome = parts[0]
      const betPart = parts.find(p => p.startsWith('bet='))
      if (betPart) betAmount = Number(betPart.split('=')[1]) || 0
    }

    let text = ''
    if (outcome === '1') text = `Vitória de ${homeTeam}`
    else if (outcome === '2') text = `Vitória de ${awayTeam}`
    else if (outcome === 'X') text = 'Empate (X)'
    else if (outcome === 'OVER_25') text = 'Golos (Mais 2.5)'
    else if (outcome === 'UNDER_25') text = 'Golos (Menos 2.5)'
    else if (outcome === 'BTTS_YES') text = 'Ambas Equipas Marcam (Sim)'
    else if (outcome === 'BTTS_NO') text = 'Ambas Equipas Marcam (Não)'

    if (betAmount > 0) {
      text += ` [Aposta: ${betAmount.toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} PTS]`
    }
    return text
  }

  // 5. Cruzar previsões com os dados reais dos jogos da API Bzzoiro
  const resolvedPredictions = await Promise.all(
    predictions.map(async (pred) => {
      try {
        const match = await bzzoiroService.getEventDetails(Number(pred.match_id))
        
        return {
          id: pred.id,
          matchId: pred.match_id,
          homeTeam: match.home_team.name,
          awayTeam: match.away_team.name,
          homeLogo: match.home_team.logo,
          awayLogo: match.away_team.logo,
          status: match.status,
          scoreHome: match.score.home,
          scoreAway: match.score.away,
          predictedOutcome: pred.predicted_outcome,
          predictedOutcomeText: getPredictionText(pred.predicted_outcome, match.home_team.name, match.away_team.name),
          isCalculated: pred.is_calculated,
          pointsAwarded: pred.points_awarded,
          date: match.date
        }
      } catch (err) {
        // Fallback em caso de erro da API
        return {
          id: pred.id,
          matchId: pred.match_id,
          homeTeam: `Jogo #${pred.match_id}`,
          awayTeam: '',
          homeLogo: null,
          awayLogo: null,
          status: 'N/A',
          scoreHome: null,
          scoreAway: null,
          predictedOutcome: pred.predicted_outcome,
          predictedOutcomeText: getPredictionText(pred.predicted_outcome, `Jogo #${pred.match_id}`, ''),
          isCalculated: pred.is_calculated,
          pointsAwarded: pred.points_awarded,
          date: pred.created_at
        }
      }
    })
  )

  // 6. Construir o histórico unificado de movimentos de pontos.
  const [{ data: transactionPredictions }, { data: rewardRedemptions }] = await Promise.all([
    supabase
      .from('predictions')
      .select('id, match_id, predicted_outcome, is_calculated, points_awarded, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('reward_redemptions')
      .select('id, reward_id, points_spent, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const betTransactions: PointTransaction[] = (transactionPredictions || []).flatMap((prediction): PointTransaction[] => {
    if (!prediction.predicted_outcome.includes(':bet=')) {
      if (!prediction.is_calculated || prediction.points_awarded <= 0) return []

      return [{
        id: `prediction-winnings-${prediction.id}`,
        title: `Pontos do prognóstico no jogo #${prediction.match_id}`,
        detail: 'Prognóstico correto',
        amount: prediction.points_awarded / 100,
        date: prediction.created_at,
        type: 'winnings',
      }]
    }

    const betPart = prediction.predicted_outcome
      .split(':')
      .find((part: string) => part.startsWith('bet='))
    const betAmount = Number(betPart?.split('=')[1]) || 0
    const rows: PointTransaction[] = [{
      id: `bet-${prediction.id}`,
      title: `Aposta no jogo #${prediction.match_id}`,
      detail: prediction.is_calculated ? 'Aposta concluída' : 'Aposta pendente',
      amount: -betAmount,
      date: prediction.created_at,
      type: 'bet',
    }]

    if (prediction.is_calculated && prediction.points_awarded > 0) {
      rows.push({
        id: `winnings-${prediction.id}`,
        title: `Ganhos da aposta no jogo #${prediction.match_id}`,
        detail: 'Retorno creditado no saldo',
        amount: prediction.points_awarded / 100,
        date: prediction.created_at,
        type: 'winnings',
      })
    }

    return rows
  })

  const rewardNames = new Map<string, string>(rewards.map((reward) => [reward.id, reward.name]))
  const redemptionTransactions: PointTransaction[] = (rewardRedemptions || []).map((redemption) => ({
    id: `reward-${redemption.id}`,
    title: rewardNames.get(redemption.reward_id) || 'Recompensa resgatada',
    detail: 'Resgate na Loja de Pontos',
    amount: -(redemption.points_spent / 100),
    date: redemption.created_at,
    type: 'reward',
    status: redemption.status,
  }))

  const pointTransactions = [...betTransactions, ...redemptionTransactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Formatar data de adesão
  const joinDate = user.created_at 
    ? new Date(user.created_at).toLocaleDateString('pt-PT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'N/A'

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-950 to-black text-zinc-100 flex flex-col font-sans">
      
      {/* Background abstract glowing shapes */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />


      {/* Main Content */}
      <main className="z-10 flex-1 max-w-none w-full px-6 md:px-8 py-8 space-y-8">
        <nav className="flex w-fit items-center gap-1 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-1" aria-label="Secções do perfil">
          <Link
            href="/dashboard"
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${activeTab === 'profile' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/15' : 'text-zinc-500 hover:text-zinc-200'}`}
          >
            <User className="h-3.5 w-3.5" />
            Perfil
          </Link>
          <Link
            href="/dashboard?tab=transactions"
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${activeTab === 'transactions' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/15' : 'text-zinc-500 hover:text-zinc-200'}`}
          >
            <ReceiptText className="h-3.5 w-3.5" />
            Transações de pontos
          </Link>
        </nav>

        {activeTab === 'transactions' ? (
          <PointTransactions transactions={pointTransactions} />
        ) : (
          <>
        
        {/* SECÇÃO SUPERIOR: Resumo de Pontos e Perfil */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Cartão de Pontuação Prominente */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-indigo-950/30 to-purple-950/10 border border-indigo-500/20 rounded-3xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/20 transition-all" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xxs font-black uppercase tracking-wider text-indigo-400">Pontuação Geral</span>
                <Trophy className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-4xl md:text-5xl font-black text-white bg-clip-text text-transparent bg-gradient-to-tr from-white to-indigo-300">
                {userPoints.toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-indigo-300 font-semibold mt-1">Pontos Olivetti Score</p>
            </div>
            
            <div className="mt-6 border-t border-zinc-850 pt-4 flex items-center justify-between">
              <span className="text-[10px] text-zinc-500">Acertar vencedor = +5 pontos</span>
              
              {/* Botão de Sincronização de Pontos Rápida (Recarrega a página) */}
              <RefreshButton className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-300 transition-all cursor-pointer" />
            </div>
          </div>

          {/* Cartão de Conta do Utilizador */}
          <div className="md:col-span-2 backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome de Utilizador */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/40 border border-zinc-850">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] text-zinc-550 uppercase tracking-wider font-bold">Nome de utilizador</p>
                  <p className="text-xs font-semibold text-zinc-200 mt-0.5 font-mono">
                    {username || 'Não especificado'}
                  </p>
                </div>
              </div>

              {/* Nome completo */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/40 border border-zinc-850">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] text-zinc-550 uppercase tracking-wider font-bold">Nome completo</p>
                  <p className="text-xs font-semibold text-zinc-200 mt-0.5">
                    {fullName || 'Não especificado'}
                  </p>
                </div>
              </div>

              {/* Data de Nascimento */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/40 border border-zinc-850">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] text-zinc-550 uppercase tracking-wider font-bold">Data de Nascimento</p>
                  <p className="text-xs font-semibold text-zinc-200 mt-0.5">{formattedBirthDate}</p>
                </div>
              </div>

              {/* Membro Desde */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/40 border border-zinc-850">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] text-zinc-550 uppercase tracking-wider font-bold">Membro Desde</p>
                  <p className="text-xs font-semibold text-zinc-200 mt-0.5">{joinDate}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/40 border border-zinc-850">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-[9px] text-zinc-550 uppercase tracking-wider font-bold">E-mail</p>
                  <p className="text-xs font-semibold text-zinc-300 truncate mt-0.5">{user.email}</p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* SECÇÃO INFERIOR: Leaderboard e Histórico de Prognósticos */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* HISTÓRICO DE PROGNÓSTICOS (Lado Esquerdo - 7/12 colunas) */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              <span>Histórico de Prognósticos Recentes</span>
            </h3>

            {resolvedPredictions.length === 0 ? (
              <div className="backdrop-blur-xl bg-zinc-900/20 border border-zinc-800/60 rounded-2xl p-12 text-center text-zinc-500 text-xs">
                Não tens nenhum palpite efetuado. Começa já a apostar nos jogos da página principal!
              </div>
            ) : (
              <div className="space-y-3">
                {resolvedPredictions.map((pred) => (
                  <div
                    key={pred.id}
                    className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-850 hover:border-zinc-800 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    {/* Teams / Logos */}
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        {pred.homeLogo && <img src={pred.homeLogo} alt="" className="w-4 h-4 object-contain" />}
                        <span className="text-xs font-bold text-zinc-200">{pred.homeTeam}</span>
                        {pred.awayTeam && <span className="text-zinc-600 text-xxs font-bold">vs</span>}
                        {pred.awayLogo && <img src={pred.awayLogo} alt="" className="w-4 h-4 object-contain" />}
                        <span className="text-xs font-bold text-zinc-200">{pred.awayTeam}</span>
                      </div>
                      
                      {/* Prediction made */}
                      <div className="text-[10px] text-zinc-500 font-medium">
                        O teu palpite: <span className="text-indigo-400 font-bold">{pred.predictedOutcomeText}</span>
                      </div>
                    </div>

                    {/* Result and points status */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-zinc-850 pt-2 sm:pt-0">
                      {/* Match Score Display */}
                      {pred.status !== 'NS' && pred.scoreHome !== null ? (
                        <span className="text-xs font-mono font-black text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded border border-zinc-900">
                          {pred.scoreHome} - {pred.scoreAway}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900">
                          Brevemente
                        </span>
                      )}

                      {/* Points / Calculation Status */}
                      {pred.isCalculated ? (
                        pred.pointsAwarded > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xxs font-black">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span>+{(pred.pointsAwarded / 100).toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Pontos</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-950 border border-zinc-900 text-zinc-500 text-xxs font-bold">
                            <span>0 Pontos</span>
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-xxs font-black animate-pulse">
                          <Clock className="w-3 h-3 text-indigo-400" />
                          <span>Pendente</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CLASSIFICAÇÃO GERAL / LEADERBOARD (Lado Direito - 5/12 colunas) */}
          <div className="lg:col-span-5">
            <LeaderboardSection
              initialLeaderboard={leaderboard}
              currentUserId={user.id}
            />
          </div>
        </div>

          </>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-zinc-900/60 bg-zinc-950/30 text-center z-10 text-xs text-zinc-600">
        <p>&copy; {new Date().getFullYear()} Olivetti Score. Criado no âmbito de Projeto Integrado I.</p>
      </footer>
    </div>
  )
}
