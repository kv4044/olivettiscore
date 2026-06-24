'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export type ActionState = {
  error?: string | null;
  success?: string | null;
} | null;

export async function signInWithGoogle(): Promise<void> {
  const requestHeaders = await headers()
  const origin = requestHeaders.get('origin')

  if (!origin) {
    redirect('/login?authError=google')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  })

  if (error || !data.url) {
    redirect('/login?authError=google')
  }

  redirect(data.url)
}

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
  const firstName = formData.get('first_name') as string
  const lastName = formData.get('last_name') as string
  const birthDate = formData.get('birth_date') as string
  const gender = formData.get('gender') as string
  const username = (formData.get('username') as string || '').trim()

  if (!email || !password || !firstName || !lastName || !birthDate || !gender || !username) {
    return { error: 'Todos os campos são obrigatórios para registo.' }
  }

  if (username.length < 3 || username.length > 20) {
    return { error: 'O nome de utilizador deve ter entre 3 e 20 caracteres.' }
  }

  const usernameRegex = /^[a-zA-Z0-9_-]+$/
  if (!usernameRegex.test(username)) {
    return { error: 'O nome de utilizador só pode conter letras, números, hífenes e underscores.' }
  }

  // Verificar se o nome de utilizador já existe na base de dados (case-insensitive)
  const { data: existingUser, error: queryError } = await supabase
    .from('profiles')
    .select('username')
    .ilike('username', username)
    .maybeSingle()

  if (queryError) {
    console.error('Erro ao verificar username:', queryError)
  }

  if (existingUser) {
    return { error: 'Este nome de utilizador já está registado. Por favor, escolhe outro.' }
  }

  // Validar data de nascimento
  const birthDateObj = new Date(birthDate)
  const birthYear = birthDateObj.getUTCFullYear()
  const today = new Date()

  if (isNaN(birthDateObj.getTime())) {
    return { error: 'A data de nascimento introduzida é inválida.' }
  }

  if (birthYear < 1930) {
    return { error: 'A data de nascimento não pode ser anterior a 1930.' }
  }

  if (birthDateObj > today) {
    return { error: 'A data de nascimento não pode ser no futuro.' }
  }

  if (password.length < 6) {
    return { error: 'A palavra-passe deve ter pelo menos 6 caracteres.' }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        gender: gender,
        username: username
      }
    }
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

export async function forgotPassword(email: string): Promise<ActionState> {
  const normalizedEmail = email.trim()

  if (!normalizedEmail) {
    return { error: 'Introduz o teu e-mail para recuperares a palavra-passe.' }
  }

  const requestHeaders = await headers()
  const origin = requestHeaders.get('origin')

  if (!origin) {
    return { error: 'Não foi possível iniciar a recuperação da palavra-passe.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${origin}/auth/callback`,
  })

  if (error) {
    return { error: error.message }
  }

  return {
    success: 'Enviámos-te um e-mail com as instruções para redefinires a palavra-passe.',
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
