import axios from 'axios'
import pkg from 'pg'
const { Pool } = pkg
import format from 'pg-format'
import JSONStream from 'JSONStream'

// --- CONFIGURAÇÃO ---
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
})

const BATCH_SIZE = 2000 // Tamanho do lote de inserção

async function robustSeed() {
  console.log('🔌 Conectando ao banco de dados...')
  const client = await pool.connect()

  try {
    console.log('📡 Consultando API do Scryfall para obter link atualizado...')

    // 1. Obter a URL de download dinâmica (muda a cada 12h)
    const metaRes = await axios.get('https://api.scryfall.com/bulk-data')
    const defaultCardsData = metaRes.data.data.find(d => d.type === 'default_cards')

    if (!defaultCardsData) throw new Error('Não foi possível encontrar o arquivo Default Cards no Scryfall.')

    console.log(`🌍 URL encontrada: ${defaultCardsData.download_uri}`)
    console.log(`🚀 Iniciando download via Stream e importação em tempo real...`)

    // 2. Iniciar Download via Stream
    const response = await axios({
      method: 'get',
      url: defaultCardsData.download_uri,
      responseType: 'stream'
    })

    const stream = response.data
    const parser = JSONStream.parse('*') // Parseia cada objeto do array JSON

    let buffer = []
    let totalProcessed = 0

    // Pipeline: Download -> Parser -> Buffer -> DB
    stream.pipe(parser)
      .on('data', async (card) => {
        // --- FILTRAGEM ---
        // Ignora tokens, cartas duplas (só pega a face principal se estiver estruturado assim) e extras
        if (card.layout === 'token' || card.layout === 'double_faced_token') return

        // --- TRATAMENTO DE IMAGEM ---
        let imageUrl = card.image_uris?.normal || card.image_uris?.large
        // Se for carta dupla (ex: Mágica // Terreno), pega a imagem da face da frente
        if (!imageUrl && card.card_faces && card.card_faces[0].image_uris) {
          imageUrl = card.card_faces[0].image_uris.normal
        }

        // --- TRATAMENTO DE DADOS ---
        const colorsSql = `{${(card.colors || []).join(',')}}`

        // --- PREÇOS ---
        const priceUsd = parseFloat(card.prices?.usd || 0)
        const priceFoil = parseFloat(card.prices?.usd_foil || 0)
        const priceEtched = parseFloat(card.prices?.usd_etched || 0)
        const priceEur = parseFloat(card.prices?.eur || 0)
        const priceTix = parseFloat(card.prices?.tix || 0)

        // Adiciona ao buffer se tiver ID válido
        if (card.id) {
          buffer.push([
            card.id,
            card.name,
            card.set,
            card.collector_number,
            card.rarity,
            card.mana_cost || '',
            card.type_line,
            imageUrl || null,
            colorsSql,
            card.booster || false,
            priceUsd,
            priceFoil,
            priceEtched,
            priceEur,
            priceTix
          ])
        }

        // --- INSERÇÃO EM LOTE ---
        if (buffer.length >= BATCH_SIZE) {
          stream.pause() // Pausa o download enquanto o banco grava
          await insertBatch(client, buffer)
          totalProcessed += buffer.length
          process.stdout.write(`\r📦 Cartas Processadas: ${totalProcessed}`)
          buffer = [] // Limpa buffer
          stream.resume() // Retoma download
        }
      })
      .on('end', async () => {
        // Insere o resto que sobrou no buffer
        if (buffer.length > 0) {
          await insertBatch(client, buffer)
          totalProcessed += buffer.length
        }
        console.log(`\n\n✅ SUCESSO ABSOLUTO! ${totalProcessed} cartas importadas/atualizadas.`)
        client.release()
        pool.end()
      })
      .on('error', (err) => {
        console.error('\n❌ Erro no Stream:', err)
        client.release()
      })

  } catch (err) {
    console.error('\n❌ Erro Fatal:', err.message)
    client.release()
  }
}

// Função SQL Otimizada (UPSERT)
async function insertBatch(client, data) {
  try {
    const query = format(
      `INSERT INTO cards (
          id, name, set_code, collector_number, rarity, mana_cost, type_line, 
          image_uri, colors, is_booster, 
          price_usd, price_usd_foil, price_usd_etched, price_eur, price_tix
       ) 
       VALUES %L 
       ON CONFLICT (id) DO UPDATE SET 
         name = EXCLUDED.name, -- Atualiza nome caso tenha correção
         image_uri = EXCLUDED.image_uri, -- Atualiza imagem se melhorou
         price_usd = EXCLUDED.price_usd,
         price_usd_foil = EXCLUDED.price_usd_foil,
         price_usd_etched = EXCLUDED.price_usd_etched,
         price_eur = EXCLUDED.price_eur,
         price_tix = EXCLUDED.price_tix,
         is_booster = EXCLUDED.is_booster`,
      data
    )
    await client.query(query)
  } catch (err) {
    console.error('\n❌ Erro ao inserir lote:', err.message)
  }
}

// Inicia
robustSeed()