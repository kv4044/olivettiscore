import fs from 'fs'
import path from 'path'
import { createAdminClient } from '../utils/supabase/admin'
import { getTeamsLogos } from '../services/logoService'

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
  
  // 1. Limpar cache anterior de 'no_logo' para testar tudo fresco
  console.log('Limpando "no_logo" da base de dados...')
  const { count, error: cleanError } = await supabase
    .from('teams')
    .update({ logo_url: null })
    .eq('logo_url', 'no_logo')
    
  if (cleanError) {
    console.error('Erro ao limpar a BD:', cleanError)
    return
  }
  console.log(`Registos limpos com sucesso.`)

  const testTeams = [
    { id: 999991, name: 'Benfica' },
    { id: 999992, name: 'Arsenal' },
    { id: 999993, name: 'Real Madrid' },
    { id: 999994, name: 'Porto' }
  ]

  try {
    console.log('A chamar getTeamsLogos com os logos corretivos...')
    const result = await getTeamsLogos(testTeams)
    console.log('Resultado do mapeamento final:')
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('Erro na execução do script:', error)
  }
}

run()
