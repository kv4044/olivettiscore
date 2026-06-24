'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

function redirectWithProfileError(message: string): never {
  redirect(`/dashboard?profileError=${encodeURIComponent(message)}`)
}

export async function updateProfile(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const username = String(formData.get('username') || '').trim()
  const fullName = String(formData.get('full_name') || '').trim()
  const birthDate = String(formData.get('birth_date') || '').trim()

  if (!username || !fullName || !birthDate) {
    redirectWithProfileError('Preenche o username, nome completo e data de nascimento.')
  }

  if (username.length < 3 || username.length > 20) {
    redirectWithProfileError('O nome de utilizador deve ter entre 3 e 20 caracteres.')
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    redirectWithProfileError('O nome de utilizador só pode conter letras, números, hífenes e underscores.')
  }

  const nameParts = fullName.split(/\s+/).filter(Boolean)
  if (nameParts.length < 2) {
    redirectWithProfileError('Introduz o nome completo com primeiro nome e apelido.')
  }

  if (fullName.length > 80) {
    redirectWithProfileError('O nome completo não pode ter mais de 80 caracteres.')
  }

  const birthDateObj = new Date(`${birthDate}T00:00:00.000Z`)
  const today = new Date()

  if (Number.isNaN(birthDateObj.getTime())) {
    redirectWithProfileError('A data de nascimento introduzida é inválida.')
  }

  if (birthDateObj.getUTCFullYear() < 1930) {
    redirectWithProfileError('A data de nascimento não pode ser anterior a 1930.')
  }

  if (birthDateObj > today) {
    redirectWithProfileError('A data de nascimento não pode ser no futuro.')
  }

  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ')
  const adminSupabase = createAdminClient()

  const { data: existingUser, error: usernameError } = await adminSupabase
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .neq('id', user.id)
    .maybeSingle()

  if (usernameError) {
    redirectWithProfileError('Não foi possível validar o nome de utilizador.')
  }

  if (existingUser) {
    redirectWithProfileError('Este nome de utilizador já está registado. Escolhe outro.')
  }

  const { error } = await adminSupabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email,
        username,
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

  if (error) {
    redirectWithProfileError('Não foi possível guardar as alterações do perfil.')
  }

  await supabase.auth.updateUser({
    data: {
      username,
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate,
    },
  })

  revalidatePath('/dashboard')
  redirect('/dashboard?profileStatus=updated')
}

export async function deleteAccount(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const adminSupabase = createAdminClient()
  const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(user.id)

  if (deleteUserError) {
    redirectWithProfileError('Nao foi possivel apagar a conta. Tenta novamente.')
  }

  const cleanupOperations = [
    adminSupabase.from('reward_redemptions').delete().eq('user_id', user.id),
    adminSupabase.from('predictions').delete().eq('user_id', user.id),
    adminSupabase.from('favorite_matches').delete().eq('user_id', user.id),
    adminSupabase.from('favorite_teams').delete().eq('user_id', user.id),
    adminSupabase.from('favorite_leagues').delete().eq('user_id', user.id),
    adminSupabase.from('profiles').delete().eq('id', user.id),
  ]

  const cleanupResults = await Promise.all(cleanupOperations)
  const cleanupError = cleanupResults.find((result) => result.error)?.error

  if (cleanupError) {
    console.error('Erro ao limpar dados da conta apagada:', cleanupError)
  }

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
