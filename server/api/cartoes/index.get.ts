import db from '../../db/index'
import { faturaDateRange, transacaoFaturaMonth } from '../../utils/fatura'

export default defineEventHandler(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const currentMonth = `${year}-${String(month).padStart(2, '0')}`

  const cartoes = db.prepare(`
    SELECT id, nome, banco, banco_key, limite, melhor_data_compra, vencimento FROM cartoes ORDER BY nome ASC
  `).all() as any[]

  return cartoes.map(c => {
    const cutoff = c.melhor_data_compra as number
    const { startDate, endDate } = faturaDateRange(year, month, cutoff)

    const mesesPagos = new Set(
      (db.prepare(`SELECT mes FROM faturas WHERE cartao_id = ? AND pago = 1`).all([c.id]) as any[]).map(r => r.mes)
    )

    // Avulsas a partir do início da fatura corrente
    const avulsas = db.prepare(`
      SELECT valor, data FROM transacoes
      WHERE tipo = 'despesa' AND cartao_id = ? AND fixa = 0 AND data >= ?
    `).all([c.id, startDate]) as { valor: number; data: string }[]

    let gastoTotal = 0
    for (const t of avulsas) {
      const mes = transacaoFaturaMonth(t.data, cutoff)
      if (!mesesPagos.has(mes)) gastoTotal += t.valor
    }

    const recorrentes = db.prepare(`
      SELECT valor, data_inicio, data_fim, parcelas FROM transacoes
      WHERE tipo = 'despesa' AND cartao_id = ? AND fixa = 1
        AND (data_fim IS NULL OR data_fim >= ?)
    `).all([c.id, startDate]) as { valor: number; data_inicio: string; data_fim: string | null; parcelas: number }[]

    for (const t of recorrentes) {
      if (t.parcelas > 0) {
        const [iy, im] = t.data_inicio.split('-').map(Number)
        const currentIndex = (year - iy) * 12 + (month - im)
        for (let i = Math.max(0, currentIndex); i < t.parcelas; i++) {
          const parcelaMes = `${iy + Math.floor((im - 1 + i) / 12)}-${String(((im - 1 + i) % 12) + 1).padStart(2, '0')}`
          if (!mesesPagos.has(parcelaMes)) gastoTotal += t.valor
        }
      } else {
        if (!mesesPagos.has(currentMonth)) gastoTotal += t.valor
      }
    }

    // gasto_mes: total da fatura do mês corrente (range correto)
    const faturaRow = db.prepare(`
      SELECT COALESCE(SUM(valor), 0) AS total FROM transacoes
      WHERE tipo = 'despesa' AND cartao_id = ?
        AND (
          (fixa = 0 AND data >= ? AND data <= ?)
          OR (fixa = 1 AND data_inicio <= ? AND (data_fim IS NULL OR data_fim >= ?))
        )
    `).get([c.id, startDate, endDate, endDate, startDate]) as { total: number }

    return {
      ...c,
      gasto_mes: faturaRow.total,
      gasto_total: gastoTotal
    }
  })
})
