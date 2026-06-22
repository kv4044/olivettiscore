'use server'

import { createClient } from '@/utils/supabase/server'

export type UpdatePasswordResult = {
  error?: string
  success?: boolean
}

export async function updatePassword(password: string): Promise<UpdatePasswordResult> {
  if (password.length < 6) {
    return { error: 'A palavra-passe deve ter pelo menos 6 caracteres.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      error: 'A sessão de recuperação não é válida. Solicita um novo link.',
    }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    if (error.code === 'same_password' || error.message.includes('different from the old password')) {
      return { error: 'A nova palavra-passe tem de ser diferente da atual.' }
    }

    if (error.code === 'weak_password') {
      return { error: 'A nova palavra-passe não cumpre os requisitos de segurança.' }
    }

    return { error: `Não foi possível alterar a palavra-passe: ${error.message}` }
  }

  return { success: true }
}
