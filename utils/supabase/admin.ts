import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('A variável NEXT_PUBLIC_SUPABASE_URL não está configurada no .env.local')
  }

  if (!serviceRoleKey) {
    throw new Error('A variável SUPABASE_SERVICE_ROLE_KEY não está configurada no .env.local')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
