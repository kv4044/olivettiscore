import Link from 'next/link'
import { Award, LogIn, LogOut, User } from 'lucide-react'
import SearchHeader from '@/components/SearchHeader'
import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/login/actions'

export default async function MainHeader() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userPoints = 0
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', user.id)
      .maybeSingle()

    userPoints = (profile?.points || 0) / 100
  }

  return (
    <header className="z-50 border-b border-zinc-800/60 bg-zinc-950/70 backdrop-blur-md sticky top-0">
      <div className="max-w-none px-6 md:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl overflow-hidden shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-all bg-zinc-900">
            <img src="/logo.png" alt="Olivetti Score Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-extrabold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 hidden sm:inline">
            Olivetti Score
          </span>
        </Link>

        <SearchHeader />

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                href="/loja"
                title="Abrir loja de pontos"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-400/40 transition-all"
              >
                <Award className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-indigo-300">
                  {userPoints.toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Pontos
                </span>
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 hover:text-white transition-all"
              >
                <User className="w-3.5 h-3.5" />
                <span>Perfil</span>
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="flex items-center justify-center w-9 h-9 rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-red-400 hover:border-red-950/50 hover:bg-red-950/10 transition-all cursor-pointer"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/15 hover:opacity-95 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar / Registar</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
