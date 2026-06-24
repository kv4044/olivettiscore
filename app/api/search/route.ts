import { NextRequest, NextResponse } from 'next/server'
import { searchSite } from '@/services/search'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const fullResults = searchParams.get('limit') === 'all'

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ leagues: [], teams: [], players: [], footballPlayers: [] })
  }

  try {
    const results = await searchSite(query, { fullResults })
    return NextResponse.json(results)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno na pesquisa'
    console.error('Erro na pesquisa:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
