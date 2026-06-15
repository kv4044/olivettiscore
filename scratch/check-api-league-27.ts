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

  const url = `https://sports.bzzoiro.com/api/v2/leagues/27/`
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
  console.log('League 27 details from API:')
  console.log(data)
}

run()
