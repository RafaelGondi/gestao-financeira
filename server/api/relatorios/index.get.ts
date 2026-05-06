import db from '../../db/index'
import { getQuery } from 'h3'
import { faturaDateRange } from '../../utils/fatura'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  let month = query.month as string | undefined

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    const now = new Date()
    month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const [yearStr, monStr] = month.split('-')
  const year = Number(yearStr), mon = Number(monStr)
  const startDate = `${yearStr}-${monStr}-01`
  const lastDay = new Date(year, mon, 0).getDate()
  const endDate = `${yearStr}-${monStr}-${String(lastDay).padStart(2, '0')}`
  const prevYear = mon === 1 ? year - 1 : year
  const prevMon = mon === 1 ? 12 : mon - 1
  const prevMonStr = `${prevYear}-${String(prevMon).padStart(2, '0')}`

  const cartoes = db.prepare(`SELECT id, nome, melhor_data_compra FROM cartoes`).all() as { id: number; nome: string; melhor_data_compra: number }[]

  interface Item {
    id: number
    descricao: string
    valor: number
    data: string
    data_inicio: string | null
    categoria: string | null
    origem: string // nome da conta, cartão ou "Fixo"
    parcelas: number
  }

  const itens: Item[] = []

  // Avulsas sem cartão
  const avulsas = db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.data, NULL AS data_inicio, t.categoria,
      COALESCE(c.nome, 'Sem conta') AS origem, 0 AS parcelas
    FROM transacoes t
    LEFT JOIN contas c ON c.id = t.conta_id
    WHERE t.tipo = 'despesa' AND t.fixa = 0 AND t.cartao_id IS NULL AND t.data >= ? AND t.data <= ?
    ORDER BY t.data DESC
  `).all([startDate, endDate]) as Item[]
  itens.push(...avulsas)

  // Fixas sem cartão
  const fixas = db.prepare(`
    SELECT t.id, t.descricao, t.valor,
      ? || '-' || substr(t.data_inicio, 9, 2) AS data,
      t.data_inicio, t.categoria,
      COALESCE(c.nome, 'Fixo') AS origem, t.parcelas
    FROM transacoes t
    LEFT JOIN contas c ON c.id = t.conta_id
    WHERE t.tipo = 'despesa' AND t.fixa = 1 AND t.cartao_id IS NULL
      AND t.data_inicio <= ? AND (t.data_fim IS NULL OR t.data_fim >= ?)
  `).all([month, endDate, startDate]) as Item[]
  itens.push(...fixas)

  // Cartão avulsas (pelo mês de fatura)
  for (const c of cartoes) {
    const { startDate: fStart, endDate: fEnd } = faturaDateRange(year, mon, c.melhor_data_compra)
    const rows = db.prepare(`
      SELECT t.id, t.descricao, t.valor, t.data, NULL AS data_inicio, t.categoria, ? AS origem, 0 AS parcelas
      FROM transacoes t
      WHERE t.tipo = 'despesa' AND t.fixa = 0 AND t.cartao_id = ? AND t.data >= ? AND t.data <= ?
      ORDER BY t.data DESC
    `).all([c.nome, c.id, fStart, fEnd]) as Item[]
    itens.push(...rows)
  }

  // Cartão fixas/parceladas
  for (const c of cartoes) {
    const cutoff = c.melhor_data_compra
    const rows = db.prepare(`
      SELECT id, descricao, valor, categoria, data_inicio, data_fim, parcelas
      FROM transacoes
      WHERE tipo = 'despesa' AND fixa = 1 AND cartao_id = ?
        AND data_inicio <= ? AND (data_fim IS NULL OR data_fim >= ?)
    `).all([c.id, endDate, startDate]) as any[]

    for (const t of rows) {
      const dayP = parseInt(t.data_inicio.slice(8, 10), 10)
      const calcMonth = cutoff > 1 && dayP >= cutoff ? prevMonStr : month
      const effectiveDate = calcMonth + '-' + t.data_inicio.slice(8, 10)
      if (effectiveDate < t.data_inicio) continue
      if (t.data_fim && effectiveDate > t.data_fim) continue
      itens.push({ id: t.id, descricao: t.descricao, valor: t.valor, data: effectiveDate, data_inicio: t.data_inicio, categoria: t.categoria, origem: c.nome, parcelas: t.parcelas ?? 0 })
    }
  }

  // Mapa categoria → meta (cor, icone, supercategoria_id)
  const catMetaMap = new Map(
    (db.prepare(`SELECT nome, cor, icone, supercategoria_id FROM categorias`).all() as { nome: string; cor: string; icone: string; supercategoria_id: number | null }[])
      .map(c => [c.nome, c])
  )

  // Mapa supercategoria id → meta
  const superMetaMap = new Map(
    (db.prepare(`SELECT id, nome, cor, icone FROM supercategorias`).all() as { id: number; nome: string; cor: string; icone: string }[])
      .map(s => [s.id, s])
  )

  // Agrupamento por categoria
  const catMap = new Map<string, { cor: string; icone: string; total: number; itens: Item[] }>()
  for (const t of itens) {
    const key = t.categoria ?? 'Sem categoria'
    const meta = t.categoria ? catMetaMap.get(t.categoria) : null
    if (!catMap.has(key)) catMap.set(key, { cor: meta?.cor ?? '#6b7280', icone: meta?.icone ?? 'i-heroicons-tag', total: 0, itens: [] })
    const entry = catMap.get(key)!
    entry.total += t.valor
    entry.itens.push(t)
  }

  const gastosPorCategoria = [...catMap.entries()]
    .map(([nome, { cor, icone, total, itens }]) => ({
      nome, cor, icone, total,
      itens: itens.sort((a, b) => b.valor - a.valor),
    }))
    .sort((a, b) => b.total - a.total)

  // Agrupamento por supercategoria
  const superMap = new Map<string, { cor: string; icone: string; total: number; itens: Item[] }>()
  for (const t of itens) {
    const catMeta = t.categoria ? catMetaMap.get(t.categoria) : null
    const superId = catMeta?.supercategoria_id ?? null
    const superMeta = superId ? superMetaMap.get(superId) : null
    const key = superMeta?.nome ?? 'Sem supercategoria'
    const cor = superMeta?.cor ?? '#6b7280'
    const icone = superMeta?.icone ?? 'i-heroicons-tag'
    if (!superMap.has(key)) superMap.set(key, { cor, icone, total: 0, itens: [] })
    const entry = superMap.get(key)!
    entry.total += t.valor
    entry.itens.push(t)
  }

  const gastosPorSupercategoria = [...superMap.entries()]
    .map(([nome, { cor, icone, total, itens }]) => ({
      nome, cor, icone, total,
      itens: itens.sort((a, b) => b.valor - a.valor),
    }))
    .sort((a, b) => b.total - a.total)

  return {
    gastosPorCategoria,
    gastosPorSupercategoria,
    totalDespesas: itens.reduce((s, t) => s + t.valor, 0),
  }
})
