import fs from 'fs'
import path from 'path'
import { createAdminClient } from '../utils/supabase/admin'

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
  const supabase = createAdminClient()
  
  const { data: leagues, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', 27)
    
  if (error) {
    console.error('Error fetching league 27:', error)
    return
  }

  console.log('League 27 in DB:', leagues)
}

run()
