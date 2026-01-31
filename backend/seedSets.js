import pkg from 'pg'
const { Pool } = pkg
import format from 'pg-format'

// --- CONFIG ---
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
})

// Tipos de coleção que queremos (ignorando tokens, promos obscuros, etc)
const VALID_TYPES = ['core', 'expansion', 'masters', 'draft_innovation', 'funny', 'commander']

async function seedSets() {
  console.log('🔌 Conectando ao banco...')
  const client = await pool.connect()

  try {
    console.log('🌍 Baixando lista de sets do Scryfall...')
    const res = await fetch('https://api.scryfall.com/sets')
    const json = await res.json()

    if (!json.data) throw new Error('Falha ao baixar dados do Scryfall')

    console.log(`📦 Encontrados ${json.data.length} sets. Filtrando...`)

    const setsToInsert = json.data
      .filter(s => VALID_TYPES.includes(s.set_type)) // Apenas tipos válidos
      .filter(s => s.card_count > 0) // Ignora sets vazios
      .map(s => [
        s.code,
        s.name,
        s.icon_svg_uri,
        s.released_at,
        s.set_type
      ])

    console.log(`🚀 Inserindo ${setsToInsert.length} coleções no banco...`)

    // Inserção em massa
    const query = format(
      'INSERT INTO sets (code, name, icon_uri, released_at, set_type) VALUES %L ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, icon_uri = EXCLUDED.icon_uri',
      setsToInsert
    )

    await client.query(query)

    console.log('✅ Sucesso! Tabela de sets atualizada.')

  } catch (err) {
    console.error('❌ Erro:', err)
  } finally {
    client.release()
    pool.end()
  }
}

seedSets()