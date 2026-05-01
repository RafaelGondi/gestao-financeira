import db from '../../../db/index'
import { getRouterParam, getQuery } from 'h3'

function parcelaAtual(dataInicio: string, month: string): number {
  const [iy, im] = dataInicio.split('-').map(Number)
  const [y, m] = month.split('-').map(Number)
  return (y - iy) * 12 + (m - im) + 1
}

export default defineEventHandler((event) => {
  const cartaoId = Number(getRouterParam(event, 'id'))
  if (!cartaoId || isNaN(cartaoId))
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })

  const cartao = db.prepare(`SELECT id, nome, banco, banco_key, limite, melhor_data_compra, vencimento FROM cartoes WHERE id = ?`).get([cartaoId]) as any
  if (!cartao)
    throw createError({ statusCode: 404, statusMessage: 'Cartão não encontrado' })

  const query = getQuery(event)
  const now = new Date()
  const month = (query.month as string) || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [year, mon] = month.split('-')
  const startDate = `${year}-${mon}-01`
  const lastDay = new Date(Number(year), Number(mon), 0).getDate()
  const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`

  const avulsas = db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, 0 AS fixa, 0 AS parcelas,
      t.data, NULL AS data_inicio, NULL AS data_fim,
      CASE WHEN t.data <= date('now') THEN 1 ELSE 0 END AS pago
    FROM transacoes t
    WHERE t.tipo = 'despesa' AND t.cartao_id = ? AND t.fixa = 0
      AND t.data >= ? AND t.data <= ?
    ORDER BY t.data DESC
  `).all([cartaoId, startDate, endDate])

  const fixas = (db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, 1 AS fixa, t.parcelas,
      ? || '-' || substr(t.data_inicio, 9, 2) AS data,
      t.data_inicio, t.data_fim,
      CASE WHEN ? || '-' || substr(t.data_inicio, 9, 2) <= date('now') THEN 1 ELSE 2 END AS pago
    FROM transacoes t
    WHERE t.tipo = 'despesa' AND t.cartao_id = ? AND t.fixa = 1
      AND t.data_inicio <= ?
      AND (t.data_fim IS NULL OR t.data_fim >= ?)
    ORDER BY t.data_inicio ASC
  `).all([month, month, cartaoId, endDate, startDate]) as any[]).map(t => ({
    ...t,
    parcela_atual: t.parcelas > 0 ? parcelaAtual(t.data_inicio, month) : null
  }))

  const lancamentos = [...fixas, ...avulsas]
  const gasto_mes = lancamentos.reduce((s, l) => s + l.valor, 0)

  // Saldo total comprometido (avulsas futuras + parcelas restantes + fixa do mês)
  const avulsasFuturas = db.prepare(`
    SELECT COALESCE(SUM(valor), 0) AS total FROM transacoes
    WHERE tipo = 'despesa' AND cartao_id = ? AND fixa = 0 AND data >= ?
  `).get([cartaoId, startDate]) as { total: number }

  const recorrentes = db.prepare(`
    SELECT valor, data_inicio, data_fim, parcelas FROM transacoes
    WHERE tipo = 'despesa' AND cartao_id = ? AND fixa = 1
      AND (data_fim IS NULL OR data_fim >= ?)
  `).all([cartaoId, startDate]) as { valor: number; data_inicio: string; data_fim: string | null; parcelas: number }[]

  const nowDate = new Date()
  let totalRecorrente = 0
  for (const t of recorrentes) {
    if (t.parcelas > 0) {
      const [iy, im] = t.data_inicio.split('-').map(Number)
      const currentIndex = (nowDate.getFullYear() - iy) * 12 + (nowDate.getMonth() + 1 - im)
      const restantes = Math.max(0, t.parcelas - currentIndex)
      totalRecorrente += t.valor * restantes
    } else {
      totalRecorrente += t.valor
    }
  }

  const gasto_total = avulsasFuturas.total + totalRecorrente

  return { cartao: { ...cartao, gasto_mes, gasto_total }, lancamentos }
})
