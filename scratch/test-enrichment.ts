import fs from 'fs'
import path from 'path'
import { bzzoiroService } from '../services/bzzoiro'

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
  try {
    console.log('Fetching events for 2026-06-15...')
    const events = await bzzoiroService.getEvents({
      date_from: '2026-06-15',
      date_to: '2026-06-15'
    })
    
    console.log(`Fetched ${events.length} events:`)
    events.forEach(event => {
      console.log(`- Match: ${event.home_team.name} vs ${event.away_team.name}`)
      console.log(`  League ID: ${event.league.id}`)
      console.log(`  League Name: ${event.league.name}`)
      console.log(`  League Country: ${event.league.country}`)
      console.log(`  League Logo: ${event.league.logo}`)
    })
  } catch (error) {
    console.error('Error fetching events:', error)
  }
}

run()
