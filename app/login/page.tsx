'use client'

import { useState, useActionState, useEffect, useTransition } from 'react'
import { forgotPassword, login, signInWithGoogle, signup } from './actions'
import { Mail, Lock, Loader2, CheckCircle2, AlertCircle, ArrowRight, ChevronDown, CircleUserRound } from 'lucide-react'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  
  // Stable wrapper to call the correct Server Action
  const handleAuth = async (prevState: any, formData: FormData) => {
    if (isLogin) {
      return await login(prevState, formData)
    } else {
      return await signup(prevState, formData)
    }
  }
  
  // Utilize useActionState to manage Server Action states
  const [state, formAction, isPending] = useActionState(
    handleAuth,
    null
  )

  // Reset state when switching tabs to clear old errors
  const [localError, setLocalError] = useState<string | null>(null)
  const [localSuccess, setLocalSuccess] = useState<string | null>(null)
  const [maxDate, setMaxDate] = useState('')
  const [isGenderOpen, setIsGenderOpen] = useState(false)
  const [selectedGender, setSelectedGender] = useState('')
  const [email, setEmail] = useState('')
  const [isRecoveringPassword, startPasswordRecovery] = useTransition()

  const handleForgotPassword = () => {
    setLocalError(null)
    setLocalSuccess(null)

    startPasswordRecovery(async () => {
      const result = await forgotPassword(email)
      setLocalError(result?.error ?? null)
      setLocalSuccess(result?.success ?? null)
    })
  }

  useEffect(() => {
    setLocalError(null)
    setLocalSuccess(null)
    setIsGenderOpen(false)
    setSelectedGender('')
  }, [isLogin])

  useEffect(() => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    setMaxDate(`${yyyy}-${mm}-${dd}`)
  }, [])

  useEffect(() => {
    if (state?.error) {
      setLocalError(state.error)
      setLocalSuccess(null)
    } else if (state?.success) {
      setLocalSuccess(state.success)
      setLocalError(null)
    }
  }, [state])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authError = params.get('authError')

    if (authError === 'google' || authError === 'oauth') {
      setLocalError('Não foi possível iniciar sessão com o Google. Tenta novamente.')
      setLocalSuccess(null)
    }
  }, [])

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center px-4 overflow-hidden bg-radial from-zinc-900 to-black text-zinc-100">
      
      {/* Background abstract glowing shapes */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md z-10">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl overflow-hidden shadow-lg shadow-indigo-500/20 mb-3 border border-white/10 bg-zinc-900">
            <img src="/logo.png" alt="Olivetti Score Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
            Olivetti Score
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            Acede à tua conta para acompanhar a tua pontuação
          </p>
        </div>

        {/* Auth Card */}
        <div className="backdrop-blur-xl bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative">
          
          {/* Tabs Selector */}
          <div className="relative flex p-1 bg-zinc-950/80 rounded-xl mb-8 border border-zinc-800/50">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
                isLogin 
                  ? 'bg-zinc-800 text-white shadow-md' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
                !isLogin 
                  ? 'bg-zinc-800 text-white shadow-md' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Feedback Messages */}
          {localError && (
            <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-red-950/30 border border-red-900/30 text-red-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Ocorreu um erro</p>
                <p className="mt-0.5 opacity-90">{localError}</p>
              </div>
            </div>
          )}

          {localSuccess && (
            <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-emerald-950/30 border border-emerald-900/30 text-emerald-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Sucesso!</p>
                <p className="mt-0.5 opacity-90">{localSuccess}</p>
              </div>
            </div>
          )}

          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl border border-zinc-700 bg-zinc-950/60 text-sm font-semibold text-zinc-100 hover:bg-zinc-900 hover:border-zinc-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CircleUserRound className="w-5 h-5 text-zinc-300" />
              <span>{isLogin ? 'Entrar com Google' : 'Registar com Google'}</span>
            </button>
          </form>

          <div className="flex items-center gap-3 my-6 text-xs font-semibold uppercase tracking-wider text-zinc-600">
            <div className="h-px flex-1 bg-zinc-800" />
            <span>ou</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          {/* Form */}
          <form 
            onSubmit={(e) => {
              if (!isLogin && !selectedGender) {
                e.preventDefault()
                setLocalError("Por favor, seleciona o teu género.")
              }
            }}
            action={formAction} 
            className="space-y-5"
          >
            {/* Campos de Registo Adicionais */}
            {!isLogin && (
              <>
                {/* Nome de Utilizador */}
                <div className="space-y-1.5">
                  <label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Nome de Utilizador
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required={!isLogin}
                    placeholder="ex: joaosilva"
                    className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-zinc-100 placeholder-zinc-650 focus:outline-none transition-all text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Primeiro Nome */}
                  <div className="space-y-1.5">
                    <label htmlFor="first_name" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Primeiro Nome
                    </label>
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      required={!isLogin}
                      placeholder="João"
                      className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-zinc-100 placeholder-zinc-650 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Apelido */}
                  <div className="space-y-1.5">
                    <label htmlFor="last_name" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Apelido
                    </label>
                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      required={!isLogin}
                      placeholder="Silva"
                      className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-zinc-100 placeholder-zinc-650 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Data de Nascimento */}
                  <div className="space-y-1.5">
                    <label htmlFor="birth_date" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Nascimento
                    </label>
                    <input
                      id="birth_date"
                      name="birth_date"
                      type="date"
                      required={!isLogin}
                      min="1930-01-01"
                      max={maxDate}
                      onInvalid={(e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.validity.rangeOverflow || target.validity.rangeUnderflow) {
                          target.setCustomValidity("A data de nascimento introduzida não é válida.");
                        } else {
                          target.setCustomValidity("");
                        }
                      }}
                      onInput={(e) => {
                        (e.target as HTMLInputElement).setCustomValidity("");
                      }}
                      className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-zinc-100 focus:outline-none transition-all text-xs"
                    />
                  </div>

                  {/* Género */}
                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Género
                    </label>
                    <input type="hidden" name="gender" value={selectedGender} />
                    
                    <button
                      type="button"
                      onClick={() => setIsGenderOpen(!isGenderOpen)}
                      className="w-full flex items-center justify-between px-3 py-[14px] bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-zinc-100 text-xs font-semibold transition-all cursor-pointer text-left focus:outline-none"
                    >
                      <span className={selectedGender ? 'text-zinc-100' : 'text-zinc-500'}>
                        {selectedGender || 'Seleciona...'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${isGenderOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isGenderOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40 cursor-default" 
                          onClick={() => setIsGenderOpen(false)} 
                        />
                        <div className="absolute left-0 right-0 mt-1 z-50 rounded-xl border border-zinc-850 bg-zinc-950/95 backdrop-blur-xl p-1.5 shadow-2xl space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                          {['Masculino', 'Feminino', 'Prefiro não divulgar'].map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setSelectedGender(option)
                                setIsGenderOpen(false)
                              }}
                              className={`w-full text-left px-3 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-between ${
                                selectedGender === option
                                  ? 'bg-indigo-500/10 text-indigo-300 border-l-2 border-indigo-500 pl-2.5 font-extrabold'
                                  : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
                              }`}
                            >
                              <span>{option}</span>
                              {selectedGender === option && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                              )}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Endereço de E-mail
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="exemplo@gmail.com"
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Palavra-passe
                </label>
              </div>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all"
                />
              </div>
              {isLogin && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isRecoveringPassword}
                  className="w-full py-2.5 px-4 rounded-xl border border-indigo-500/50 bg-indigo-500/10 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-400 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isRecoveringPassword ? 'A enviar e-mail...' : 'Recuperar palavra-passe'}
                </button>
              )}
              {!isLogin && (
                <p className="text-xs text-zinc-500 mt-1">
                  A palavra-passe deve conter pelo menos 6 caracteres.
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className="relative w-full py-3.5 px-4 mt-8 rounded-xl font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-[0.98] text-white shadow-lg shadow-indigo-500/20 border border-white/10 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>A processar...</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Entrar na Conta' : 'Criar Conta Grátis'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info/help */}
        <div className="mt-8 p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/40 text-center">
          <p className="text-xs text-zinc-500">
            {isLogin ? (
              <>
                Ainda não tens conta?{' '}
                <button 
                  onClick={() => setIsLogin(false)} 
                  className="font-medium text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                >
                  Regista-te aqui
                </button>
              </>
            ) : (
              <>
                Já tens uma conta criada?{' '}
                <button 
                  onClick={() => setIsLogin(true)} 
                  className="font-medium text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                >
                  Inicia sessão aqui
                </button>
              </>
            )}
          </p>
        </div>

      </div>
    </div>
  )
}
