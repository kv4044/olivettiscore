import fs from 'fs'
import path from 'path'

// Carregar .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8')
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const index = trimmed.indexOf('=')
    if (index === -1) return
    const key = trimmed.substring(0, index).trim()
    let val = trimmed.substring(index + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1)
    }
    process.env[key] = val
  })
}

async function run() {
  const apiKey = process.env.BZZOIRO_API_KEY
  if (!apiKey) {
    console.error('BZZOIRO_API_KEY missing!')
    return
  }

  // Obter data de hoje no formato YYYY-MM-DD
  const dateStr = '2026-06-15'
  const url = `https://sports.bzzoiro.com/api/v2/events/?date_from=${dateStr}&date_to=${dateStr}`
  console.log('Fetching from URL:', url)

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    console.error('Failed to fetch:', response.statusText)
    return
  }

  const data = await response.json()
  const results = data.results || data
  console.log(`Total events fetched: ${results.length}`)

  const leagues = new Map()
  for (const event of results) {
    if (!leagues.has(event.league_id)) {
      leagues.set(event.league_id, {
        id: event.league_id,
        count: 0,
        exampleEvent: `${event.home_team} vs ${event.away_team}`
      })
    }
    leagues.get(event.league_id).count++
  }

  console.log('Leagues found in response:')
  console.log(Array.from(leagues.values()))
}

run()
