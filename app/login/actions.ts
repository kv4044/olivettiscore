'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export type ActionState = {
  error?: string | null;
  success?: string | null;
} | null;

export async function login(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'E-mail e palavra-passe são obrigatórios.' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Treat invalid login messages to Portuguese if possible
    let errorMsg = error.message
    if (error.message === 'Invalid login credentials') {
      errorMsg = 'E-mail ou palavra-passe incorretos.'
    }
    return { error: errorMsg }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'E-mail e palavra-passe são obrigatórios.' }
  }

  if (password.length < 6) {
    return { error: 'A palavra-passe deve ter pelo menos 6 caracteres.' }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Se a confirmação de e-mail estiver desativada no Supabase, ele cria uma sessão de imediato
  if (data?.session) {
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  } else {
    return { success: 'Conta criada com sucesso! Por favor, verifica a tua caixa de e-mail para confirmar o registo.' }
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
