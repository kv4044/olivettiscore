import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const requestedPath = requestUrl.searchParams.get('next')
  const nextPath =
    requestedPath?.startsWith('/') && !requestedPath.startsWith('//')
      ? requestedPath
      : '/reset-password'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(nextPath, requestUrl.origin))
    }
  }

  if (nextPath !== '/reset-password') {
    return NextResponse.redirect(
      new URL('/login?authError=oauth', requestUrl.origin)
    )
  }

  return NextResponse.redirect(
    new URL('/login?recoveryError=invalid-link', requestUrl.origin)
  )
}
