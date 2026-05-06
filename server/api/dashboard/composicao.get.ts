import db from '../../db/index'
import { getQuery } from 'h3'
import { faturaDateRange } from '../../utils/fatura'

interface Item {
  descricao: string
  valor: number
  data: string
  origem: string
  categoria: string | null
}

interface Segmento {
  total: number
  itens: Item[]
}

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

  const seg: Record<string, Segmento> = {
    contaAvulso:      { total: 0, itens: [] },
    cartaoAvulso:     { total: 0, itens: [] },
    contaParcelado:   { total: 0, itens: [] },
    cartaoParcelado:  { total: 0, itens: [] },
    contaRecorrente:  { total: 0, itens: [] },
    cartaoRecorrente: { total: 0, itens: [] },
  }

  function add(key: string, item: Item) {
    seg[key].total += item.valor
    seg[key].itens.push(item)
  }

  // Conta avulso
  const avulsasConta = db.prepare(`
    SELECT t.descricao, t.valor, t.data, t.categoria,
      COALESCE(c.nome, 'Sem conta') AS origem
    FROM transacoes t
    LEFT JOIN contas c ON c.id = t.conta_id
    WHERE t.tipo = 'despesa' AND t.fixa = 0 AND t.cartao_id IS NULL
      AND t.data >= ? AND t.data <= ?
    ORDER BY t.data DESC
  `).all([startDate, endDate]) as Item[]
  for (const r of avulsasConta) add('contaAvulso', r)

  // Conta parcelado + recorrente
  const fixasConta = db.prepare(`
    SELECT t.descricao, t.valor, t.parcelas, t.categoria,
      ? || '-' || substr(t.data_inicio, 9, 2) AS data,
      COALESCE(c.nome, 'Fixo') AS origem
    FROM transacoes t
    LEFT JOIN contas c ON c.id = t.conta_id
    WHERE t.tipo = 'despesa' AND t.fixa = 1 AND t.cartao_id IS NULL
      AND t.data_inicio <= ? AND (t.data_fim IS NULL OR t.data_fim >= ?)
  `).all([month, endDate, startDate]) as (Item & { parcelas: number })[]
  for (const r of fixasConta) {
    add(r.parcelas > 0 ? 'contaParcelado' : 'contaRecorrente', r)
  }

  const cartoes = db.prepare(`SELECT id, nome, melhor_data_compra FROM cartoes`).all() as { id: number; nome: string; melhor_data_compra: number }[]

  // Cartão avulso
  for (const c of cartoes) {
    const { startDate: fStart, endDate: fEnd } = faturaDateRange(year, mon, c.melhor_data_compra)
    const rows = db.prepare(`
      SELECT t.descricao, t.valor, t.data, t.categoria, ? AS origem
      FROM transacoes t
      WHERE t.tipo = 'despesa' AND t.fixa = 0 AND t.cartao_id = ? AND t.data >= ? AND t.data <= ?
      ORDER BY t.data DESC
    `).all([c.nome, c.id, fStart, fEnd]) as Item[]
    for (const r of rows) add('cartaoAvulso', r)
  }

  // Cartão parcelado + recorrente
  for (const c of cartoes) {
    const cutoff = c.melhor_data_compra
    const rows = db.prepare(`
      SELECT t.descricao, t.valor, t.parcelas, t.categoria, t.data_inicio, t.data_fim, ? AS origem
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
      const key = t.parcelas > 0 ? 'cartaoParcelado' : 'cartaoRecorrente'
      add(key, { descricao: t.descricao, valor: t.valor, data: effectiveDate, origem: t.origem, categoria: t.categoria })
    }
  }

  const r2 = (n: number) => Math.round(n * 100) / 100

  const result: Record<string, { total: number; itens: Item[] }> = {}
  for (const [key, s] of Object.entries(seg)) {
    result[key] = {
      total: r2(s.total),
      itens: s.itens.sort((a, b) => b.valor - a.valor),
    }
  }

  const total = r2(Object.values(seg).reduce((s, v) => s + v.total, 0))

  return { ...result, total }
})
