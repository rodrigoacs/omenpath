import express from 'express'
import cors from 'cors'
import pkg from 'pg'
import format from 'pg-format'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const { Pool } = pkg

// --- CONFIG ---
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
})

const app = express()
app.use(cors())
app.use(express.json())

// --- ECONOMY CONSTANTS ---
const EXCHANGE_RATE = 50
const FOIL_CHANCE = 0.1
const FOIL_MULTIPLIER = 2
const SELL_RATE = 0.4
const MAX_BATCH_SIZE = 50
const BULK_RATES = { common: 0.02, uncommon: 0.1, rare: 0.25, mythic: 1.0 }
const JWT_SECRET = process.env.JWT_SECRET
const REWARD_AMOUNT = 1000

// --- UTILITIES ---
function getBestPrice(card, isFoil) {
  let price = isFoil ? parseFloat(card.price_usd_foil) : parseFloat(card.price_usd)
  if (!price) price = parseFloat(card.price_usd_etched)
  if (!price) price = isFoil ? parseFloat(card.price_usd) : parseFloat(card.price_usd_foil)

  const EUR_TO_USD = 1.09
  if (!price && card.price_eur) price = parseFloat(card.price_eur) * EUR_TO_USD
  if (!price && card.price_tix) price = parseFloat(card.price_tix)

  if (!price || price <= 0) price = BULK_RATES[card.rarity] || 0.02
  return price
}

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]

// --- ROUTES ---

app.get('/', (req, res) =>
  res.json({ status: 'Omenpath Online 💎' })
)

// SETS
app.get('/sets', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.* FROM sets s
      WHERE EXISTS (SELECT 1 FROM cards c WHERE c.set_code = s.code AND c.is_booster = true)
      ORDER BY s.released_at DESC
    `)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar sets' })
  }
})

// USER
app.get('/user/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT username, gold FROM users WHERE id = $1', [req.params.id])
    const count = await pool.query('SELECT SUM(quantity) as total FROM collection WHERE user_id = $1', [req.params.id])

    if (result.rows.length) {
      res.json({ ...result.rows[0], collection_count: count.rows[0].total || 0 })
    } else {
      res.status(404).json({ error: 'User not found' })
    }
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// COLLECTION
app.get('/collection/:userId', async (req, res) => {
  const { userId } = req.params
  const page = parseInt(req.query.page) || 1
  const limit = 50
  const offset = (page - 1) * limit
  const { rarity, set, sort, colors } = req.query

  try {
    let whereClause = 'WHERE col.user_id = $1'
    const params = [userId]
    let paramIndex = 2

    if (rarity) {
      whereClause += ` AND c.rarity = $${paramIndex}`
      params.push(rarity)
      paramIndex++
    }
    if (set) {
      whereClause += ` AND c.set_code = $${paramIndex}`
      params.push(set)
      paramIndex++
    }

    if (colors && colors.length > 0) {
      const colorList = colors.split(',')
      const hasColorless = colorList.includes('C')
      const coloredMana = colorList.filter(c => c !== 'C' && c !== 'multi')
      const conditions = []

      if (hasColorless) conditions.push(`array_length(c.colors, 1) IS NULL`)
      if (coloredMana.length > 0) {
        conditions.push(`c.colors && $${paramIndex}::text[]`)
        params.push(coloredMana)
        paramIndex++
      }
      if (conditions.length > 0) whereClause += ` AND (${conditions.join(' OR ')})`
    }

    const sqlBasePrice = `
      COALESCE(
        NULLIF(c.price_usd, 0), 
        NULLIF(c.price_usd_foil, 0),
        NULLIF(c.price_usd_etched, 0),
        NULLIF(c.price_eur, 0) * 1.09,
        NULLIF(c.price_tix, 0),
        CASE c.rarity WHEN 'mythic' THEN 1.00 WHEN 'rare' THEN 0.25 WHEN 'uncommon' THEN 0.10 ELSE 0.02 END
      )
    `
    const sqlSellPrice = `FLOOR(${sqlBasePrice} * ${EXCHANGE_RATE} * ${SELL_RATE})`

    let orderBy = 'ORDER BY MAX(col.obtained_at) DESC'
    if (sort === 'quantity') orderBy = 'ORDER BY total_quantity DESC'
    if (sort === 'name') orderBy = 'ORDER BY c.name ASC'
    if (sort === 'rarity') orderBy = `ORDER BY CASE c.rarity WHEN 'mythic' THEN 4 WHEN 'rare' THEN 3 WHEN 'uncommon' THEN 2 ELSE 1 END DESC, total_quantity DESC`
    if (sort === 'price') orderBy = `ORDER BY MAX(${sqlBasePrice}) DESC`

    const query = `
      SELECT 
        c.name, 
        SUM(col.quantity) as total_quantity,
        COALESCE(
          (SELECT image_uri FROM cards WHERE id = pref.preferred_card_id),
          (ARRAY_AGG(c.image_uri ORDER BY col.obtained_at DESC))[1]
        ) as cover_image,
        (ARRAY_AGG(c.rarity ORDER BY col.obtained_at DESC))[1] as main_rarity,
        JSON_AGG(json_build_object(
          'id', c.id, 
          'set_code', c.set_code, 
          'rarity', c.rarity,
          'image', c.image_uri, 
          'quantity', col.quantity, 
          'is_foil', col.is_foil,
          'sell_price', (
            CASE 
              WHEN col.is_foil THEN GREATEST(1, ${sqlSellPrice} * ${FOIL_MULTIPLIER})
              ELSE GREATEST(1, ${sqlSellPrice}) 
            END
          )
        )) as variants
      FROM collection col
      JOIN cards c ON col.card_id = c.id
      LEFT JOIN card_preferences pref ON pref.user_id = col.user_id AND pref.card_name = c.name
      ${whereClause}
      GROUP BY c.name, c.rarity, pref.preferred_card_id
      ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `

    const result = await pool.query(query, params)
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT c.name) FROM collection col JOIN cards c ON col.card_id = c.id ${whereClause}`,
      params
    )

    res.json({
      cards: result.rows,
      page,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar coleção' })
  }
})

// BOOSTER
app.get('/booster/:setCode', async (req, res) => {
  const { setCode } = req.params
  const userId = req.query.userId || 1
  let count = Math.min(Math.max(parseInt(req.query.count) || 1, 1), MAX_BATCH_SIZE)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const setRes = await client.query('SELECT booster_price, name FROM sets WHERE code = $1', [setCode])
    if (setRes.rows.length === 0) throw new Error('Set não encontrado')

    const singlePackPrice = setRes.rows[0].booster_price || 200
    const totalCost = singlePackPrice * count

    const userRes = await client.query('SELECT gold FROM users WHERE id = $1', [userId])
    if (!userRes.rows.length) throw new Error('Usuário não encontrado')
    if (userRes.rows[0].gold < totalCost) throw new Error('Saldo insuficiente!')

    await client.query('UPDATE users SET gold = gold - $1 WHERE id = $2', [totalCost, userId])

    const setCardsRes = await client.query(
      `SELECT id, name, image_uri, rarity FROM cards WHERE set_code = $1 AND is_booster = true`,
      [setCode]
    )
    const setCards = setCardsRes.rows
    if (setCards.length === 0) throw new Error('Set sem cartas.')

    const commons = setCards.filter(c => c.rarity === 'common')
    const uncommons = setCards.filter(c => c.rarity === 'uncommon')
    const rares = setCards.filter(c => c.rarity === 'rare')
    const mythics = setCards.filter(c => c.rarity === 'mythic')

    const validRares = rares.length > 0 ? rares : (mythics.length > 0 ? mythics : uncommons)
    const validMythics = mythics.length > 0 ? mythics : validRares
    const validUncommons = uncommons.length > 0 ? uncommons : commons
    const validCommons = commons.length > 0 ? commons : validUncommons

    let allCards = []
    for (let i = 0; i < count; i++) {
      const isMythic = Math.random() < 0.125
      const rarePool = isMythic ? validMythics : validRares

      const pushCard = (pool) => {
        if (!pool.length) return
        const baseCard = pickRandom(pool)
        const isFoil = Math.random() < FOIL_CHANCE
        allCards.push({ ...baseCard, is_foil: isFoil })
      }

      pushCard(rarePool)
      for (let u = 0; u < 3; u++) pushCard(validUncommons)
      for (let c = 0; c < 11; c++) pushCard(validCommons)
    }

    const aggMap = new Map()
    for (const card of allCards) {
      const key = `${card.id}_${card.is_foil}`
      aggMap.set(key, (aggMap.get(key) || 0) + 1)
    }

    const insertData = []
    for (const [key, qty] of aggMap.entries()) {
      const [cardId, isFoilStr] = key.split('_')
      insertData.push([userId, cardId, parseInt(qty), isFoilStr === 'true'])
    }

    if (insertData.length > 0) {
      const query = format(`
        INSERT INTO collection (user_id, card_id, quantity, is_foil)
        VALUES %L
        ON CONFLICT (user_id, card_id, is_foil) 
        DO UPDATE SET quantity = collection.quantity + EXCLUDED.quantity
      `, insertData)
      await client.query(query)
    }

    const finalUser = await client.query('SELECT gold FROM users WHERE id = $1', [userId])
    await client.query('COMMIT')

    res.json({
      success: true,
      new_balance: finalUser.rows[0].gold,
      cards: allCards,
      opened: count,
    })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(400).json({ error: err.message })
  } finally {
    client.release()
  }
})

// SELL SINGLE
app.post('/sell', async (req, res) => {
  const { userId, cardId, isFoil } = req.body
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const check = await client.query(`
      SELECT col.quantity, c.rarity, c.price_usd, c.price_usd_foil, c.price_usd_etched, c.price_eur, c.price_tix
      FROM collection col JOIN cards c ON col.card_id = c.id
      WHERE col.user_id = $1 AND col.card_id = $2 AND col.is_foil = $3
    `, [userId, cardId, isFoil])

    if (!check.rows.length || check.rows[0].quantity < 1) throw new Error('Carta não encontrada')

    const cardData = check.rows[0]
    let realPriceUsd = getBestPrice(cardData, isFoil)
    let sellPrice = Math.max(1, Math.floor(realPriceUsd * EXCHANGE_RATE * SELL_RATE))
    if (isFoil) sellPrice *= FOIL_MULTIPLIER

    if (cardData.quantity === 1) {
      await client.query('DELETE FROM collection WHERE user_id=$1 AND card_id=$2 AND is_foil=$3', [userId, cardId, isFoil])
    } else {
      await client.query('UPDATE collection SET quantity = quantity - 1 WHERE user_id=$1 AND card_id=$2 AND is_foil=$3', [userId, cardId, isFoil])
    }

    const userUp = await client.query('UPDATE users SET gold = gold + $1 WHERE id = $2 RETURNING gold', [sellPrice, userId])
    await client.query('COMMIT')

    res.json({
      success: true,
      newGold: userUp.rows[0].gold,
      newQuantity: cardData.quantity - 1,
      soldFor: sellPrice,
    })
  } catch (e) {
    await client.query('ROLLBACK')
    res.status(400).json({ error: e.message })
  } finally {
    client.release()
  }
})

// SELL SURPLUS
app.post('/sell-surplus', async (req, res) => {
  const { userId } = req.body
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const items = await client.query(`
      SELECT col.card_id, col.is_foil, col.quantity, c.rarity, c.price_usd, c.price_usd_foil, c.price_usd_etched, c.price_eur, c.price_tix
      FROM collection col JOIN cards c ON col.card_id = c.id 
      WHERE col.user_id = $1 AND col.quantity > 4
    `, [userId])

    let totalGold = 0
    let totalCount = 0

    for (const item of items.rows) {
      const amountToSell = item.quantity - 4
      const realPriceUsd = getBestPrice(item, item.is_foil)
      let unitPrice = Math.max(1, Math.floor(realPriceUsd * EXCHANGE_RATE * SELL_RATE))
      if (item.is_foil) unitPrice *= FOIL_MULTIPLIER

      totalGold += amountToSell * unitPrice
      totalCount += amountToSell
      await client.query('UPDATE collection SET quantity = 4 WHERE user_id=$1 AND card_id=$2 AND is_foil=$3', [userId, item.card_id, item.is_foil])
    }

    if (totalGold > 0) {
      await client.query('UPDATE users SET gold = gold + $1 WHERE id = $2', [totalGold, userId])
    }
    await client.query('COMMIT')

    res.json({ soldCount: totalCount, goldEarned: totalGold })
  } catch (e) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: e.message })
  } finally {
    client.release()
  }
})

// SELL ALL
app.post('/sell-all', async (req, res) => {
  const { userId } = req.body
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const items = await client.query(`
      SELECT col.card_id, col.is_foil, col.quantity, c.rarity, c.price_usd, c.price_usd_foil, c.price_usd_etched, c.price_eur, c.price_tix
      FROM collection col 
      JOIN cards c ON col.card_id = c.id 
      WHERE col.user_id = $1
    `, [userId])

    if (items.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.json({ soldCount: 0, goldEarned: 0 })
    }

    let totalGold = 0
    let totalCards = 0

    for (const item of items.rows) {
      const realPriceUsd = getBestPrice(item, item.is_foil)
      let unitPrice = Math.max(1, Math.floor(realPriceUsd * EXCHANGE_RATE * SELL_RATE))
      if (item.is_foil) unitPrice *= FOIL_MULTIPLIER

      totalGold += item.quantity * unitPrice
      totalCards += item.quantity
    }

    await client.query('UPDATE users SET gold = gold + $1 WHERE id = $2', [totalGold, userId])
    await client.query('DELETE FROM collection WHERE user_id = $1', [userId])
    await client.query('DELETE FROM card_preferences WHERE user_id = $1', [userId])
    await client.query('COMMIT')

    res.json({ success: true, soldCount: totalCards, goldEarned: totalGold })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Erro ao vender coleção: ' + err.message })
  } finally {
    client.release()
  }
})

// TRACKER
app.get('/tracker/:userId', async (req, res) => {
  const { userId } = req.params

  try {
    const query = `
      SELECT 
        s.code, s.name, s.icon_uri, s.released_at,
        COUNT(c.id) FILTER (WHERE c.is_booster = true) as total_cards,
        COUNT(c.id) FILTER (WHERE c.is_booster = true AND c.rarity = 'common') as total_common,
        COUNT(c.id) FILTER (WHERE c.is_booster = true AND c.rarity = 'uncommon') as total_uncommon,
        COUNT(c.id) FILTER (WHERE c.is_booster = true AND c.rarity = 'rare') as total_rare,
        COUNT(c.id) FILTER (WHERE c.is_booster = true AND c.rarity = 'mythic') as total_mythic,
        COUNT(DISTINCT col.card_id) as owned_total,
        COUNT(DISTINCT col.card_id) FILTER (WHERE c.rarity = 'common') as owned_common,
        COUNT(DISTINCT col.card_id) FILTER (WHERE c.rarity = 'uncommon') as owned_uncommon,
        COUNT(DISTINCT col.card_id) FILTER (WHERE c.rarity = 'rare') as owned_rare,
        COUNT(DISTINCT col.card_id) FILTER (WHERE c.rarity = 'mythic') as owned_mythic
      FROM sets s
      JOIN cards c ON s.code = c.set_code
      LEFT JOIN collection col ON c.id = col.card_id AND col.user_id = $1
      WHERE EXISTS (SELECT 1 FROM cards c2 WHERE c2.set_code = s.code AND c2.is_booster = true)
      GROUP BY s.code, s.name, s.icon_uri, s.released_at
      ORDER BY s.released_at DESC
    `
    const result = await pool.query(query, [userId])
    const stats = result.rows.map(row => ({
      code: row.code,
      name: row.name,
      icon: row.icon_uri,
      date: row.released_at,
      total: parseInt(row.total_cards),
      owned: parseInt(row.owned_total),
      percent: Math.floor((parseInt(row.owned_total) / parseInt(row.total_cards)) * 100),
      breakdown: {
        common: { total: parseInt(row.total_common), owned: parseInt(row.owned_common) },
        uncommon: { total: parseInt(row.total_uncommon), owned: parseInt(row.owned_uncommon) },
        rare: { total: parseInt(row.total_rare), owned: parseInt(row.owned_rare) },
        mythic: { total: parseInt(row.total_mythic), owned: parseInt(row.owned_mythic) },
      },
    }))
    res.json(stats)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao gerar estatísticas' })
  }
})

app.get('/tracker/:userId/set/:setCode', async (req, res) => {
  const { userId, setCode } = req.params

  try {
    const query = `
      SELECT c.id, c.name, c.image_uri, c.rarity, COALESCE(SUM(col.quantity), 0)::int as quantity
      FROM cards c
      LEFT JOIN collection col ON c.id = col.card_id AND col.user_id = $1
      WHERE c.set_code = $2 AND c.is_booster = true
      GROUP BY c.id
      ORDER BY CASE c.rarity WHEN 'mythic' THEN 1 WHEN 'rare' THEN 2 WHEN 'uncommon' THEN 3 ELSE 4 END, c.name ASC
    `
    const result = await pool.query(query, [userId, setCode])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar cartas do set' })
  }
})

// DAILY REWARD
app.post('/daily-reward', async (req, res) => {
  const { userId } = req.body
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const userRes = await client.query('SELECT last_daily_claim FROM users WHERE id = $1', [userId])
    const lastClaim = userRes.rows[0].last_daily_claim
    const now = new Date()
    const canClaim = !lastClaim || (now - new Date(lastClaim)) > 24 * 60 * 60 * 1000

    if (!canClaim) {
      const nextClaim = new Date(new Date(lastClaim).getTime() + 24 * 60 * 60 * 1000)
      throw new Error(`Volte em ${Math.ceil((nextClaim - now) / (1000 * 60))} minutos.`)
    }

    await client.query('UPDATE users SET gold = gold + $1, last_daily_claim = NOW() WHERE id = $2', [REWARD_AMOUNT, userId])
    const finalRes = await client.query('SELECT gold FROM users WHERE id = $1', [userId])
    await client.query('COMMIT')

    res.json({ success: true, newGold: finalRes.rows[0].gold, reward: REWARD_AMOUNT })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(400).json({ error: err.message })
  } finally {
    client.release()
  }
})

// PREFERENCES
app.post('/set-preference', async (req, res) => {
  const { userId, cardName, cardId } = req.body

  try {
    await pool.query(`
      INSERT INTO card_preferences (user_id, card_name, preferred_card_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, card_name) DO UPDATE SET preferred_card_id = $3
    `, [userId, cardName, cardId])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// AUTH - REGISTER
app.post('/auth/register', async (req, res) => {
  const { username, email, password } = req.body

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos' })
  }

  const client = await pool.connect()
  try {
    const userCheck = await client.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    )
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Usuário ou Email já cadastrados' })
    }

    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)
    const result = await client.query(
      'INSERT INTO users (username, email, password, gold) VALUES ($1, $2, $3, 1000) RETURNING id, username, gold',
      [username, email, hash]
    )

    const newUser = result.rows[0]
    const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: newUser })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao registrar' })
  } finally {
    client.release()
  }
})

// AUTH - LOGIN
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Credenciais inválidas' })
    }

    const user = result.rows[0]
    const validPass = await bcrypt.compare(password, user.password)
    if (!validPass) {
      return res.status(400).json({ error: 'Credenciais inválidas' })
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' })
    delete user.password
    res.json({ token, user })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro no login' })
  }
})

app.listen(3000, () => console.log('🔥 Server Omenpath 3000 (Balanced Economy)'))