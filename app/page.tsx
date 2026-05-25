import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { ArrowRight, ShieldCheck, Sparkles, BookOpen } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="relative min-h-screen bg-radial from-zinc-900 to-black text-zinc-100 flex flex-col justify-between overflow-hidden">
      
      {/* Background abstract glowing shapes */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header/Navbar */}
      <header className="z-10 border-b border-zinc-800/40 bg-zinc-900/20 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/10">
              <span className="text-sm font-black tracking-wider text-white">OS</span>
            </div>
            <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              Olivetti Score
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-all duration-300"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 hover:text-white transition-all duration-300"
              >
                <span>Entrar</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="z-10 flex-1 flex flex-col justify-center items-center text-center px-4 max-w-4xl mx-auto py-20">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800/80 text-zinc-300 text-xs font-semibold mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Projeto Integrado I - Novas Funcionalidades</span>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight md:leading-none bg-clip-text text-transparent bg-gradient-to-b from-white via-zinc-200 to-zinc-500 max-w-3xl animate-in fade-in slide-in-from-top-6 duration-700">
          Acompanha a tua Performance com o Olivetti Score
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed animate-in fade-in slide-in-from-top-8 duration-900">
          Uma plataforma moderna e integrada para gerir, pontuar e visualizar o teu desempenho de forma rápida e segura.
        </p>

        {/* Call to Actions */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md animate-in fade-in slide-in-from-bottom-6 duration-1000">
          {user ? (
            <Link
              href="/dashboard"
              className="w-full sm:w-auto flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-8 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 border border-white/10 hover:opacity-95 active:scale-95 transition-all"
            >
              <span>Ir para o Painel Principal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="w-full sm:w-auto flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-8 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 border border-white/10 hover:opacity-95 active:scale-95 transition-all"
              >
                <span>Começar Agora Grátis</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://nextjs.org/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex h-12 items-center justify-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/30 px-8 text-sm font-semibold text-zinc-300 hover:bg-zinc-900/80 hover:text-white transition-all duration-300"
              >
                <BookOpen className="w-4 h-4" />
                <span>Ler Docs</span>
              </a>
            </>
          )}
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-24 border-t border-zinc-800/40 pt-12 animate-in fade-in duration-1000">
          <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/40 text-left">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-zinc-200">Autenticação Segura</h3>
            <p className="text-zinc-500 text-sm mt-2">Proteção robusta de rotas e dados de utilizador com criptografia nativa do Supabase.</p>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/40 text-left">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
              <span className="font-bold text-sm">SSR</span>
            </div>
            <h3 className="font-bold text-zinc-200">Next.js 15/16 + SSR</h3>
            <p className="text-zinc-500 text-sm mt-2">Renderização no lado do servidor para garantir tempos de carregamento instantâneos e excelente SEO.</p>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/40 text-left">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400 mb-4">
              <span className="font-bold text-sm">UI</span>
            </div>
            <h3 className="font-bold text-zinc-200">Design Premium</h3>
            <p className="text-zinc-500 text-sm mt-2">Interface responsiva, moderna e fluida com vidro fosco (glassmorphism) e animações.</p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-zinc-800/40 text-center z-10">
        <p className="text-xs text-zinc-600">
          &copy; {new Date().getFullYear()} Olivetti Score. Criado no âmbito de Projeto Integrado I.
        </p>
      </footer>

    </div>
  )
}
