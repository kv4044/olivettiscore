import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { bzzoiroService } from '@/services/bzzoiro'
import { getFlagUrl } from '@/utils/flags'
import Link from 'next/link'
import PlayerImage from '@/components/PlayerImage'
import { 
  Award, 
  Activity, 
  Calendar, 
  ChevronLeft, 
  User, 
  Shield,
  Zap,
  Clock
} from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export const revalidate = 60 // Revalidar a cada minuto

export default async function PlayerDetailsPage({ params }: PageProps) {
  const { id } = await params
  const playerId = Number(id)

  if (isNaN(playerId)) {
    notFound()
  }

  const supabase = await createClient()

  // 1. Obter estatísticas do jogador de futebol da base de dados
  const { data: statsData, error: statsError } = await supabase
    .from('player_stats')
    .select('player_name, goals, assists, passes, yellow_cards, red_cards, position, team_id, teams(name, logo_url)')
    .eq('player_id', playerId)

  if (statsError) {
    console.error('Erro ao obter estatísticas da DB:', statsError)
  }

  let goals = 0
  let assists = 0
  let passes = 0
  let yellow_cards = 0
  let red_cards = 0
  let teamName = ''
  let teamLogo = ''
  let position = ''
  let teamId = null

  if (statsData && statsData.length > 0) {
    statsData.forEach(row => {
      goals += row.goals || 0
      assists += row.assists || 0
      passes += row.passes || 0
      yellow_cards += row.yellow_cards || 0
      red_cards += row.red_cards || 0
      
      const teamObj = Array.isArray(row.teams) ? row.teams[0] : row.teams
      if (teamObj?.name) {
        teamName = teamObj.name
        teamLogo = teamObj.logo_url || ''
      }
      if (row.position) {
        position = row.position
      }
      if (row.team_id) {
        teamId = row.team_id
      }
    })
  }

  // 2. Obter detalhes adicionais do jogador de futebol a partir da API Bzzoiro
  let apiDetails: any = null
  try {
    apiDetails = await bzzoiroService.getPlayerDetails(playerId)
  } catch (apiErr) {
    console.error('Erro ao chamar API Bzzoiro para detalhes do jogador:', apiErr)
  }

  if (!apiDetails && (!statsData || statsData.length === 0)) {
    notFound()
  }

  const playerName = apiDetails?.name || statsData?.[0]?.player_name || `Jogador #${playerId}`
  const shortName = apiDetails?.short_name || null
  const nationality = apiDetails?.nationality || 'Nacionalidade desconhecida'
  const dateOfBirth = apiDetails?.date_of_birth || null
  const heightCm = apiDetails?.height_cm || null
  const preferredFoot = apiDetails?.preferred_foot || null
  const marketValueEur = apiDetails?.market_value_eur || null
  const contractUntil = apiDetails?.contract_until || null
  const jerseyNumber = apiDetails?.jersey_number || null
  const playerPosition = position || apiDetails?.position || 'M'
  const specificPosition = apiDetails?.specific_position || null
  const attributes = apiDetails?.attributes || null

  // Se não tivermos dados da equipa da DB, tentar obter da API Bzzoiro
  if (!teamName && apiDetails?.current_team_id) {
    teamId = apiDetails.current_team_id
    try {
      const teamDetails = await bzzoiroService.getTeamDetails(apiDetails.current_team_id)
      teamName = teamDetails?.name || 'Equipa Desconhecida'
    } catch (err) {
      console.error('Erro ao obter detalhes da equipa pela API:', err)
    }
  }

  const getPositionName = (pos: string) => {
    switch (pos) {
      case 'G': return 'Guarda-redes'
      case 'D': return 'Defesa'
      case 'M': return 'Médio'
      case 'F': return 'Avançado'
      default: return 'Jogador'
    }
  }

  const positionColor = 
    playerPosition === 'F' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
    playerPosition === 'M' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
    playerPosition === 'D' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-950 to-black text-zinc-100 flex flex-col font-sans">
      
      {/* Background glowing shapes */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <main className="z-10 flex-1 max-w-4xl w-full mx-auto px-6 py-8 space-y-6">
        
        {/* BACK ACTION */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/80 px-3.5 py-2 rounded-xl"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar ao Início</span>
          </Link>
        </div>

        {/* PLAYER HERO SECTION */}
        <section className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/15 transition-all" />
          
          {/* Player Photo */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 shadow-lg relative p-2">
            <PlayerImage
              playerId={playerId}
              playerName={playerName}
              className="w-full h-full object-cover rounded-xl"
            />
            {jerseyNumber && (
              <span className="absolute bottom-2 right-2 bg-indigo-600 text-white font-mono text-xs font-black px-2 py-0.5 rounded-lg border border-indigo-500 shadow-md">
                #{jerseyNumber}
              </span>
            )}
          </div>

          {/* Name & Basic Info */}
          <div className="text-center md:text-left space-y-3 flex-1">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-none">
                {playerName}
              </h1>
              {shortName && shortName !== playerName && (
                <p className="text-sm font-semibold text-zinc-400">{shortName}</p>
              )}
            </div>

            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
              <span className={`text-[10px] font-black px-2 py-0.5 border rounded-md uppercase ${positionColor}`}>
                {getPositionName(playerPosition)}
              </span>
              {specificPosition && (
                <span className="text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700/60 px-2 py-0.5 rounded-md font-bold">
                  {specificPosition}
                </span>
              )}
            </div>

            {teamName && (
              <div className="inline-flex items-center gap-2 bg-zinc-950/60 border border-zinc-850 px-3.5 py-1.5 rounded-xl text-xs font-bold text-zinc-200">
                {teamLogo && (
                  <img src={teamLogo} alt="" className="w-4 h-4 object-contain" />
                )}
                {teamId ? (
                  <Link href={`/equipa/${teamId}`} className="hover:text-indigo-400 transition-colors">
                    {teamName}
                  </Link>
                ) : (
                  <span>{teamName}</span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Bio Details (5/12) */}
          <div className="md:col-span-5 space-y-6">
            <div className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-3xl p-5 shadow-lg space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <User className="w-4 h-4 text-purple-400" />
                <span>Dados Biográficos</span>
              </h3>

              <div className="space-y-3">
                <div className="p-3 bg-zinc-950/40 border border-zinc-850/60 rounded-2xl flex justify-between items-center">
                  <span className="text-[10px] text-zinc-550 uppercase tracking-wider font-bold">Nacionalidade</span>
                  <div className="flex items-center gap-1.5">
                    {getFlagUrl(nationality) && (
                      <img 
                        src={getFlagUrl(nationality) || undefined} 
                        alt="" 
                        className="w-4 h-2.5 object-cover rounded-sm"
                      />
                    )}
                    <span className="text-xs font-bold text-zinc-200">{nationality}</span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950/40 border border-zinc-850/60 rounded-2xl flex justify-between items-center">
                  <span className="text-[10px] text-zinc-550 uppercase tracking-wider font-bold">Idade / Nasc.</span>
                  <span className="text-xs font-bold text-zinc-200">
                    {dateOfBirth ? (
                      <>
                        {new Date().getFullYear() - new Date(dateOfBirth).getFullYear()} anos 
                        <span className="text-[9px] text-zinc-500 font-semibold ml-1">({dateOfBirth})</span>
                      </>
                    ) : 'N/A'}
                  </span>
                </div>

                <div className="p-3 bg-zinc-950/40 border border-zinc-850/60 rounded-2xl flex justify-between items-center">
                  <span className="text-[10px] text-zinc-550 uppercase tracking-wider font-bold">Altura</span>
                  <span className="text-xs font-bold text-zinc-200">
                    {heightCm ? `${heightCm} cm` : 'N/A'}
                  </span>
                </div>

                <div className="p-3 bg-zinc-950/40 border border-zinc-850/60 rounded-2xl flex justify-between items-center">
                  <span className="text-[10px] text-zinc-550 uppercase tracking-wider font-bold">Pé Preferido</span>
                  <span className="text-xs font-bold text-zinc-200">
                    {preferredFoot === 'R' ? 'Direito' : preferredFoot === 'L' ? 'Esquerdo' : preferredFoot ? 'Ambos' : 'N/A'}
                  </span>
                </div>

                <div className="p-3 bg-zinc-950/40 border border-zinc-850/60 rounded-2xl flex justify-between items-center">
                  <span className="text-[10px] text-zinc-550 uppercase tracking-wider font-bold">Valor de Mercado</span>
                  <span className="text-xs font-black text-indigo-400">
                    {marketValueEur ? (
                      new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(marketValueEur)
                    ) : 'N/A'}
                  </span>
                </div>

                {contractUntil && (
                  <div className="p-3 bg-zinc-950/40 border border-zinc-850/60 rounded-2xl flex justify-between items-center">
                    <span className="text-[10px] text-zinc-550 uppercase tracking-wider font-bold">Contrato Até</span>
                    <span className="text-xs font-bold text-zinc-350">{contractUntil}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Stats & Attributes (7/12) */}
          <div className="md:col-span-7 space-y-6">
            
            {/* SEASON STATS */}
            <div className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-3xl p-5 shadow-lg space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span>Estatísticas da Época</span>
              </h3>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3.5 bg-zinc-950/50 border border-zinc-850/60 rounded-2xl">
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-wider">Golos</span>
                  <p className="text-xl font-black text-white mt-1">{goals}</p>
                </div>
                <div className="p-3.5 bg-zinc-950/50 border border-zinc-850/60 rounded-2xl">
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-wider">Assistências</span>
                  <p className="text-xl font-black text-white mt-1">{assists}</p>
                </div>
                <div className="p-3.5 bg-zinc-950/50 border border-zinc-850/60 rounded-2xl">
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-wider">Passes</span>
                  <p className="text-xl font-black text-white mt-1">{passes.toLocaleString('pt-PT')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-1">
                <div className="p-3 bg-zinc-950/30 border border-zinc-850/60 rounded-2xl flex items-center justify-between px-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-4 bg-amber-400 rounded-sm border border-amber-300" />
                    <span className="text-xs font-bold text-zinc-400">Cartões Amarelos</span>
                  </div>
                  <span className="font-mono text-sm font-black text-amber-400">{yellow_cards}</span>
                </div>

                <div className="p-3 bg-zinc-950/30 border border-zinc-850/60 rounded-2xl flex items-center justify-between px-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-4 bg-red-500 rounded-sm border border-red-450" />
                    <span className="text-xs font-bold text-zinc-400">Cartões Vermelhos</span>
                  </div>
                  <span className="font-mono text-sm font-black text-red-500">{red_cards}</span>
                </div>
              </div>
            </div>

            {/* ATTRIBUTES */}
            {attributes && (
              <div className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-3xl p-5 shadow-lg space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Habilidades & Atributos</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-zinc-950/35 border border-zinc-850/50 rounded-2xl">
                  {Object.entries(attributes)
                    .filter(([key]) => key !== 'position')
                    .map(([key, value]) => {
                      const label = key === 'attacking' ? 'Ataque' :
                                    key === 'defending' ? 'Defesa' :
                                    key === 'tactical' ? 'Tática' :
                                    key === 'technical' ? 'Técnica' :
                                    key === 'creativity' ? 'Criatividade' : key
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="capitalize text-zinc-400">{label}</span>
                            <span className="text-indigo-400">{String(value)}</span>
                          </div>
                          <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${Number(value)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-zinc-900/60 bg-zinc-950/30 text-center z-10 text-xs text-zinc-650">
        <p>&copy; {new Date().getFullYear()} Olivetti Score. Criado no âmbito de Projeto Integrado I.</p>
        <p className="mt-1 text-xxs text-zinc-700">Dados fornecidos em tempo real pela API Bzzoiro Sports.</p>
      </footer>
    </div>
  )
}
