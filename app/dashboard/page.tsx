import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '../login/actions'
import { LogOut, User, ShieldCheck, Mail, Calendar, KeyRound } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Format date nicely
  const joinDate = user.created_at 
    ? new Date(user.created_at).toLocaleDateString('pt-PT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'N/A'

  return (
    <div className="relative min-h-screen bg-radial from-zinc-900 to-black text-zinc-100 flex flex-col">
      
      {/* Background abstract glowing shapes */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header/Navbar */}
      <header className="z-10 border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md sticky top-0">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/10">
              <span className="text-sm font-black tracking-wider text-white">OS</span>
            </div>
            <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              Olivetti Score
            </span>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-zinc-800 bg-zinc-900/60 hover:bg-red-950/20 hover:text-red-400 hover:border-red-900/30 transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </form>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="z-10 flex-1 max-w-6xl w-full mx-auto px-4 py-12 flex flex-col justify-start">
        
        {/* Welcome Section */}
        <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sessão Autenticada</span>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            Olá, bem-vindo de volta!
          </h2>
          <p className="text-zinc-400 mt-2">
            Tens acesso total às tuas pontuações e configurações seguras.
          </p>
        </div>

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* User Profile Card */}
          <div className="md:col-span-2 backdrop-blur-xl bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
                <User className="w-5 h-5 text-indigo-400" />
                <span>Informações de Conta</span>
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/40">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Endereço de E-mail</p>
                    <p className="text-sm font-semibold text-zinc-200 mt-0.5">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/40">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Membro Desde</p>
                    <p className="text-sm font-semibold text-zinc-200 mt-0.5">{joinDate}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/40">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">ID do Utilizador (UID)</p>
                    <p className="text-xs font-mono text-zinc-400 mt-1 select-all break-all">{user.id}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 border-t border-zinc-800/60 pt-6 flex items-center justify-between text-xs text-zinc-500">
              <span>Segurança da base de dados garantida por criptografia.</span>
              <span className="font-semibold text-indigo-400">Supabase Auth</span>
            </div>
          </div>

          {/* Quick Actions Side Card */}
          <div className="backdrop-blur-xl bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
                <span>Painel de Estatísticas</span>
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/40 text-center">
                  <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Pontuação Olivetti</p>
                  <p className="text-5xl font-black text-white mt-2 font-sans bg-clip-text text-transparent bg-gradient-to-tr from-indigo-400 to-purple-500">
                    0
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">Nenhum teste efetuado</p>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-center">
                  <p className="text-xs font-semibold text-indigo-400">Precisas de ajuda?</p>
                  <p className="text-xs text-zinc-400 mt-1">Acede à documentação para aprenderes a pontuar o teu score.</p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button className="w-full py-3 px-4 rounded-xl font-semibold bg-zinc-800 hover:bg-zinc-700 text-white text-sm transition-all duration-300 active:scale-[0.98]">
                Iniciar Novo Teste
              </button>
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-zinc-800/60 text-center z-10">
        <p className="text-xs text-zinc-600">
          &copy; {new Date().getFullYear()} Olivetti Score. Todos os direitos reservados.
        </p>
      </footer>

    </div>
  )
}
