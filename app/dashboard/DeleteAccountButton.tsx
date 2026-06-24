'use client'

import { useFormStatus } from 'react-dom'
import { Loader2, Trash2 } from 'lucide-react'
import { deleteAccount } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-red-200 transition-all hover:bg-red-500 hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 cursor-pointer"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      {pending ? 'A apagar...' : 'Apagar conta permanentemente'}
    </button>
  )
}

export default function DeleteAccountButton() {
  return (
    <form
      action={deleteAccount}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          'Tens a certeza que queres apagar permanentemente a tua conta? Esta acao e irreversivel: todos os dados deste perfil serao eliminados da base de dados e so sera possivel voltar criando uma conta nova do zero.'
        )

        if (!confirmed) {
          event.preventDefault()
        }
      }}
    >
      <SubmitButton />
    </form>
  )
}
