import fs from 'fs'
import path from 'path'
import { createAdminClient } from '../utils/supabase/admin'
import { getLeaguesLogos } from '../services/logoService'

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
  
  // Limpar "no_logo" ou logos anteriores das ligas na BD para o teste
  console.log('Limpando dados de teste das ligas na BD...')
  await supabase
    .from('leagues')
    .update({ logo_url: null })
    .in('id', [1, 2, 3])

  const testLeagues = [
    { id: 1, name: 'Premier League' },
    { id: 2, name: 'La Liga' },
    { id: 3, name: 'Serie A' }
  ]

  try {
    console.log('A chamar getLeaguesLogos...')
    const result = await getLeaguesLogos(testLeagues)
    console.log('Resultado do mapeamento das ligas:')
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('Erro na execução do script:', error)
  }
}

run()
