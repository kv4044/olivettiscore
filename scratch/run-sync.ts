import fs from 'fs'
import path from 'path'
import { bzzoiroSyncService } from '../services/bzzoiroSync'

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
    console.log('Starting sync of leagues and teams...')
    const result = await bzzoiroSyncService.syncLeaguesAndTeams()
    console.log('Sync result:', result)
  } catch (error) {
    console.error('Error during sync:', error)
  }
}

run()
