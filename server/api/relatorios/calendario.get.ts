import db from '../../db/index'
import { getQuery } from 'h3'

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
  const today = new Date().toISOString().slice(0, 10)

  const catMetaMap = new Map(
    (db.prepare(`SELECT nome, cor, icone FROM categorias`).all() as { nome: string; cor: string; icone: string }[])
      .map(c => [c.nome, c])
  )

  interface DayItem {
    data: string
    valor: number
    categoria: string | null
    parcelas: number
    data_inicio: string | null
    descricao: string
    origem: string
  }

  const defaultIcon = 'i-heroicons-tag'

  const itens: DayItem[] = []

  // Avulsas sem cartão
  const avulsas = db.prepare(`
    SELECT t.data, t.valor, t.categoria, 0 AS parcelas, NULL AS data_inicio,
      t.descricao, COALESCE(c.nome, 'Sem conta') AS origem
    FROM transacoes t
    LEFT JOIN contas c ON c.id = t.conta_id
    WHERE t.tipo = 'despesa' AND t.fixa = 0 AND t.cartao_id IS NULL
      AND t.data >= ? AND t.data <= ? AND t.data <= ?
  `).all([startDate, endDate, today]) as DayItem[]
  itens.push(...avulsas)

  // Fixas sem cartão
  const fixas = db.prepare(`
    SELECT
      ? || '-' || substr(t.data_inicio, 9, 2) AS data,
      t.valor, t.categoria, t.parcelas, t.data_inicio,
      t.descricao, COALESCE(c.nome, 'Fixo') AS origem
    FROM transacoes t
    LEFT JOIN contas c ON c.id = t.conta_id
    WHERE t.tipo = 'despesa' AND t.fixa = 1 AND t.cartao_id IS NULL
      AND t.data_inicio <= ? AND (t.data_fim IS NULL OR t.data_fim >= ?)
  `).all([month, endDate, startDate]) as DayItem[]

  for (const t of fixas) {
    if (t.data > today) continue
    if (t.parcelas > 0 && t.data_inicio?.slice(0, 7) !== t.data?.slice(0, 7)) continue
    itens.push(t)
  }

  // Cartão avulsas — compras feitas dentro do mês visualizado
  const cartoes = db.prepare(`SELECT id, nome, melhor_data_compra FROM cartoes`).all() as { id: number; nome: string; melhor_data_compra: number }[]
  for (const c of cartoes) {
    const rows = db.prepare(`
      SELECT t.data, t.valor, t.categoria, 0 AS parcelas, NULL AS data_inicio,
        t.descricao, ? AS origem
      FROM transacoes t
      WHERE t.tipo = 'despesa' AND t.fixa = 0 AND t.cartao_id = ?
        AND t.data >= ? AND t.data <= ? AND t.data <= ?
    `).all([c.nome, c.id, startDate, endDate, today]) as DayItem[]
    itens.push(...rows)
  }

  // Cartão fixas/parceladas
  for (const c of cartoes) {
    const cutoff = c.melhor_data_compra
    const rows = db.prepare(`
      SELECT t.valor, t.categoria, t.data_inicio, t.parcelas, t.descricao, ? AS origem, t.data_fim
      FROM transacoes t
      WHERE t.tipo = 'despesa' AND t.fixa = 1 AND t.cartao_id = ?
        AND t.data_inicio <= ? AND (t.data_fim IS NULL OR t.data_fim >= ?)
    `).all([c.nome, c.id, endDate, startDate]) as any[]

    for (const t of rows) {
      const dayP = parseInt(t.data_inicio.slice(8, 10), 10)
      const calcMonth = cutoff > 1 && dayP >= cutoff ? prevMonStr : month
      const effectiveDate = calcMonth + '-' + t.data_inicio.slice(8, 10)
      if (effectiveDate < t.data_inicio) continue
      if (t.data_fim && effectiveDate > t.data_fim) continue
      if (effectiveDate > today) continue
      if (t.parcelas > 0 && t.data_inicio.slice(0, 7) !== effectiveDate.slice(0, 7)) continue
      if (effectiveDate.slice(0, 7) !== month) continue
      itens.push({ data: effectiveDate, valor: t.valor, categoria: t.categoria, parcelas: t.parcelas ?? 0, data_inicio: t.data_inicio, descricao: t.descricao, origem: t.origem })
    }
  }

  // Agrupa por dia
  const dayMap = new Map<number, {
    total: number
    categorias: Map<string, { total: number; cor: string }>
    itens: { descricao: string; valor: number; categoria: string; cor: string; icone: string; origem: string }[]
  }>()

  for (const item of itens) {
    const day = parseInt(item.data.slice(8, 10), 10)
    if (!dayMap.has(day)) dayMap.set(day, { total: 0, categorias: new Map(), itens: [] })
    const entry = dayMap.get(day)!
    entry.total += item.valor
    const catKey = item.categoria ?? 'Sem categoria'
    const meta = item.categoria ? catMetaMap.get(item.categoria) : null
    const cor = meta?.cor ?? '#6b7280'
    const icone = meta?.icone ?? defaultIcon
    if (!entry.categorias.has(catKey)) entry.categorias.set(catKey, { total: 0, cor })
    entry.categorias.get(catKey)!.total += item.valor
    entry.itens.push({ descricao: item.descricao, valor: item.valor, categoria: catKey, cor, icone, origem: item.origem })
  }

  const dias = [...dayMap.entries()].map(([day, { total, categorias, itens }]) => {
    const cats = [...categorias.entries()]
      .map(([nome, { total, cor }]) => ({ nome, total, cor }))
      .sort((a, b) => b.total - a.total)
    return {
      day,
      total,
      cor: cats[0].cor,
      categorias: cats,
      itens: itens.sort((a, b) => b.valor - a.valor),
    }
  })

  return { dias, totalDias: lastDay }
})
