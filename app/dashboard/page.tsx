import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logout } from '../login/actions'
import { bzzoiroService } from '@/services/bzzoiro'
import { 
  LogOut, 
  User, 
  Award, 
  Mail, 
  Calendar, 
  ArrowLeft,
  Trophy,
  History,
  TrendingUp,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

export const revalidate = 0 // Forçar renderização dinâmica para sempre mostrar dados atualizados

// Helper para mascarar o e-mail no Leaderboard (por privacidade)
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return 'utilizador'
  if (local.length <= 3) {
    return `${local.substring(0, 1)}***@${domain}`
  }
  return `${local.substring(0, 3)}***@${domain}`
}

export default async function DashboardPage() {
  // 1. Verificar Sessão do Utilizador
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Procurar Detalhes do Perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('points, first_name, last_name, birth_date, gender')
    .eq('id', user.id)
    .maybeSingle()

  const userPoints = profile?.points || 0
  const firstName = profile?.first_name || user.user_metadata?.first_name || ''
  const lastName = profile?.last_name || user.user_metadata?.last_name || ''
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : ''
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
    .select('email, points')
    .order('points', { ascending: false })
    .limit(10)

  const leaderboard = leaderboardData || []

  // 4. Obter Histórico de Prognósticos Recentes (últimos 5)
  const { data: rawPredictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const predictions = rawPredictions || []

  // 5. Cruzar previsões com os dados reais dos jogos da API Bzzoiro
  const resolvedPredictions = await Promise.all(
    predictions.map(async (pred) => {
      try {
        const match = await bzzoiroService.getEventDetails(Number(pred.match_id))
        
        // Mapear prognóstico
        let predOutcomeText = ''
        if (pred.predicted_outcome === '1') predOutcomeText = `Vitória de ${match.home_team.name}`
        else if (pred.predicted_outcome === '2') predOutcomeText = `Vitória de ${match.away_team.name}`
        else predOutcomeText = 'Empate (X)'

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
          predictedOutcomeText: predOutcomeText,
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
          predictedOutcomeText: pred.predicted_outcome === '1' ? 'Casa' : pred.predicted_outcome === '2' ? 'Fora' : 'Empate',
          isCalculated: pred.is_calculated,
          pointsAwarded: pred.points_awarded,
          date: pred.created_at
        }
      }
    })
  )

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

      {/* Header/Navbar */}
      <header className="z-50 border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-md sticky top-0">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center justify-center w-9 h-9 rounded-xl border border-zinc-800 hover:bg-zinc-850 text-zinc-300 hover:text-white transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-extrabold text-base leading-none">
                {firstName ? `Olá, ${firstName}!` : 'Painel Olivetti Score'}
              </h1>
              <p className="text-[10px] text-zinc-500 mt-1">Gere as tuas apostas e a tua conta</p>
            </div>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-zinc-800 bg-zinc-900/60 hover:bg-red-950/20 hover:text-red-400 hover:border-red-900/30 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair da Conta</span>
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="z-10 flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        
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
                {userPoints}
              </p>
              <p className="text-xs text-indigo-300 font-semibold mt-1">Pontos Olivetti Score</p>
            </div>
            
            <div className="mt-6 border-t border-zinc-850 pt-4 flex items-center justify-between">
              <span className="text-[10px] text-zinc-500">Acertar vencedor = +5 pontos</span>
              
              {/* Botão de Sincronização de Pontos Rápida */}
              <a
                href={`/api/predictions/calculate?secret=${process.env.SYNC_SECRET || ''}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-300 transition-all cursor-pointer"
                title="Recalcular prognósticos finalizados"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Atualizar Pontos</span>
              </a>
            </div>
          </div>

          {/* Cartão de Conta do Utilizador */}
          <div className="md:col-span-2 backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome e Apelido */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/40 border border-zinc-850">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] text-zinc-550 uppercase tracking-wider font-bold">Nome e Apelido</p>
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

            <div className="mt-4 p-3 rounded-2xl bg-zinc-950/20 border border-zinc-850/60 text-xxs text-zinc-500 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-zinc-600" />
              <span>UID: <span className="font-mono text-zinc-400 select-all">{user.id}</span></span>
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
                            <span>+5 Pontos</span>
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
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Classificação Geral</span>
            </h3>

            <div className="backdrop-blur-xl bg-zinc-900/20 border border-zinc-800/60 rounded-3xl overflow-hidden shadow-lg">
              {leaderboard.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  Sem dados de utilizadores disponíveis no momento.
                </div>
              ) : (
                <div className="divide-y divide-zinc-900/60">
                  {leaderboard.map((profileRow, index) => {
                    const rank = index + 1
                    const isOwnProfile = profileRow.email === user.email

                    // Cores de pódio
                    let rankBadge = 'text-zinc-400 bg-zinc-950 border-zinc-850'
                    if (rank === 1) rankBadge = 'text-amber-400 bg-amber-500/10 border-amber-500/20 font-black'
                    if (rank === 2) rankBadge = 'text-zinc-300 bg-zinc-300/10 border-zinc-300/20 font-black'
                    if (rank === 3) rankBadge = 'text-amber-600 bg-amber-600/10 border-amber-600/20 font-black'

                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3.5 px-4 gap-4 transition-colors ${
                          isOwnProfile ? 'bg-indigo-500/5 border-l-2 border-indigo-500 pl-3.5' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          {/* Rank Circle */}
                          <div className={`w-6 h-6 rounded-lg border flex items-center justify-center text-xxs font-mono ${rankBadge}`}>
                            {rank}
                          </div>

                          {/* Email (masked) */}
                          <span className={`text-xs font-semibold ${isOwnProfile ? 'text-indigo-300 font-extrabold' : 'text-zinc-300'}`}>
                            {maskEmail(profileRow.email)} {isOwnProfile && '(Eu)'}
                          </span>
                        </div>

                        {/* Points */}
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-black ${isOwnProfile ? 'text-indigo-400' : 'text-zinc-200'}`}>
                            {profileRow.points}
                          </span>
                          <span className="text-[9px] font-bold text-zinc-600 uppercase">PTS</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-zinc-900/60 bg-zinc-950/30 text-center z-10 text-xs text-zinc-600">
        <p>&copy; {new Date().getFullYear()} Olivetti Score. Criado no âmbito de Projeto Integrado I.</p>
      </footer>
    </div>
  )
}
