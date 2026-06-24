import { NextResponse } from 'next/server'

export function validateSyncSecret(request: Request): NextResponse | null {
  const { searchParams } = new URL(request.url)
  const secretParam = searchParams.get('secret')
  const syncSecret = process.env.SYNC_SECRET

  if (process.env.NODE_ENV !== 'production') {
    return null
  }

  if (!syncSecret) {
    return NextResponse.json(
      { error: 'SYNC_SECRET nao esta configurado no servidor.' },
      { status: 500 }
    )
  }

  if (secretParam !== syncSecret) {
    return NextResponse.json(
      { error: 'Nao autorizado. Forneca o secret correto (?secret=...)' },
      { status: 401 }
    )
  }

  return null
}
