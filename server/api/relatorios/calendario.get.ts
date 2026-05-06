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
  const today = new Date().toISOString().slice(0, 10)

  const catMetaMap = new Map(
    (db.prepare(`SELECT nome, cor FROM categorias`).all() as { nome: string; cor: string }[])
      .map(c => [c.nome, c.cor])
  )

  interface DayItem { data: string; valor: number; categoria: string | null; parcelas: number; data_inicio: string | null }

  const itens: DayItem[] = []

  // Avulsas sem cartão (já passadas)
  const avulsas = db.prepare(`
    SELECT data, valor, categoria, 0 AS parcelas, NULL AS data_inicio
    FROM transacoes
    WHERE tipo = 'despesa' AND fixa = 0 AND cartao_id IS NULL
      AND data >= ? AND data <= ? AND data <= ?
  `).all([startDate, endDate, today]) as DayItem[]
  itens.push(...avulsas)

  // Fixas sem cartão (somente as que já chegaram)
  const fixas = db.prepare(`
    SELECT
      ? || '-' || substr(data_inicio, 9, 2) AS data,
      valor, categoria, parcelas, data_inicio
    FROM transacoes
    WHERE tipo = 'despesa' AND fixa = 1 AND cartao_id IS NULL
      AND data_inicio <= ? AND (data_fim IS NULL OR data_fim >= ?)
  `).all([month, endDate, startDate]) as DayItem[]

  for (const t of fixas) {
    if (t.data > today) continue
    // Parcelas: só aparece no mês da compra
    if (t.parcelas > 0 && t.data_inicio?.slice(0, 7) !== t.data?.slice(0, 7)) continue
    itens.push(t)
  }

  // Cartão avulsas — só compras feitas dentro do mês visualizado
  const cartoes = db.prepare(`SELECT id, melhor_data_compra FROM cartoes`).all() as { id: number; melhor_data_compra: number }[]
  for (const c of cartoes) {
    const rows = db.prepare(`
      SELECT data, valor, categoria, 0 AS parcelas, NULL AS data_inicio
      FROM transacoes
      WHERE tipo = 'despesa' AND fixa = 0 AND cartao_id = ?
        AND data >= ? AND data <= ? AND data <= ?
    `).all([c.id, startDate, endDate, today]) as DayItem[]
    itens.push(...rows)
  }

  // Cartão fixas/parceladas — usa data efetiva do mês, só se já passou
  for (const c of cartoes) {
    const cutoff = c.melhor_data_compra
    const rows = db.prepare(`
      SELECT valor, categoria, data_inicio, parcelas
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
      if (effectiveDate > today) continue
      if (t.parcelas > 0 && t.data_inicio.slice(0, 7) !== effectiveDate.slice(0, 7)) continue
      // Só inclui se a data efetiva cai no mês visualizado
      if (effectiveDate.slice(0, 7) !== month) continue
      itens.push({ data: effectiveDate, valor: t.valor, categoria: t.categoria, parcelas: t.parcelas ?? 0, data_inicio: t.data_inicio })
    }
  }

  // Agrupa por dia
  const dayMap = new Map<number, { total: number; categorias: Map<string, { total: number; cor: string }> }>()

  for (const item of itens) {
    const day = parseInt(item.data.slice(8, 10), 10)
    if (!dayMap.has(day)) dayMap.set(day, { total: 0, categorias: new Map() })
    const entry = dayMap.get(day)!
    entry.total += item.valor
    const catKey = item.categoria ?? 'Sem categoria'
    const cor = item.categoria ? (catMetaMap.get(item.categoria) ?? '#6b7280') : '#6b7280'
    if (!entry.categorias.has(catKey)) entry.categorias.set(catKey, { total: 0, cor })
    entry.categorias.get(catKey)!.total += item.valor
  }

  const dias = [...dayMap.entries()].map(([day, { total, categorias }]) => {
    const cats = [...categorias.entries()]
      .map(([nome, { total, cor }]) => ({ nome, total, cor }))
      .sort((a, b) => b.total - a.total)
    return { day, total, cor: cats[0].cor, categorias: cats }
  })

  return { dias, totalDias: lastDay }
})
