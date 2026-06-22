'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Lock } from 'lucide-react'
import { updatePassword } from './actions'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('A palavra-passe deve ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmation) {
      setError('As palavras-passe não coincidem.')
      return
    }

    setIsPending(true)
    const result = await updatePassword(password)
    setIsPending(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setSuccess(true)
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-radial from-zinc-900 to-black text-zinc-100">
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md z-10 backdrop-blur-xl bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight">Nova palavra-passe</h1>
          <p className="text-sm text-zinc-400 mt-2">Escolhe uma nova palavra-passe para a tua conta.</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-red-950/30 border border-red-900/30 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {success ? (
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-4" />
            <p className="font-semibold">Palavra-passe alterada com sucesso.</p>
            <Link href="/dashboard" className="inline-block mt-6 text-sm font-medium text-indigo-400 hover:text-indigo-300 underline">
              Continuar para a minha conta
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <PasswordField id="password" label="Nova palavra-passe" value={password} onChange={setPassword} />
            <PasswordField id="password-confirmation" label="Confirmar palavra-passe" value={confirmation} onChange={setConfirmation} />
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 px-4 rounded-xl font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
              {isPending ? 'A guardar...' : 'Guardar nova palavra-passe'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

type PasswordFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}

function PasswordField({ id, label, value, onChange }: PasswordFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</label>
      <div className="relative group">
        <Lock className="absolute inset-y-0 left-3 my-auto w-5 h-5 text-zinc-500 group-focus-within:text-indigo-400" />
        <input
          id={id}
          type="password"
          required
          minLength={6}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-zinc-100 focus:outline-none transition-all"
        />
      </div>
    </div>
  )
}
