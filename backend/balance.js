import pkg from 'pg'
const { Pool } = pkg

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
})

async function balanceEconomy() {
  const client = await pool.connect()
  console.log('⚖️  Balanceando economia dos boosters...')

  try {
    // Busca todos os sets
    const res = await client.query('SELECT code, released_at, set_type, name FROM sets')

    for (const set of res.rows) {
      let price = 200 // Preço Base padrão

      // CORREÇÃO AQUI: Tratamento robusto da data
      let year = 2025
      if (set.released_at) {
        // Se for objeto Date ou String, o construtor Date resolve
        const dateObj = new Date(set.released_at)
        if (!isNaN(dateObj.getTime())) {
          year = dateObj.getFullYear()
        }
      }

      // REGRA 1: Taxa de Antiguidade (Vintage Tax)
      if (year < 1995) price = 50000        // Alpha, Beta, Legends (1993-1994)
      else if (year < 1999) price = 10000   // Era de Ouro (Urza, etc)
      else if (year < 2010) price = 1000    // Modern Era Antigo
      else if (year < 2020) price = 400     // Modern Era Novo

      // REGRA 2: Sets Especiais (Masters, Premium)
      // Se for Masters, custa caro independente do ano
      if (set.set_type === 'masters' || set.set_type === 'masterpiece') {
        price = Math.max(price, 2000)
      }

      // Atualiza no banco
      await client.query('UPDATE sets SET booster_price = $1 WHERE code = $2', [price, set.code])

      // Log apenas dos caros para não poluir o terminal
      if (price > 200) {
        console.log(`💰 [${year}] ${set.name} -> ${price} moedas`)
      }
    }

    console.log('✅ Economia ajustada com sucesso!')

  } catch (err) {
    console.error('❌ Erro:', err)
  } finally {
    client.release()
    pool.end()
  }
}

balanceEconomy()