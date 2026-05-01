import db from '../../db/index'

export default defineEventHandler(() => {
  const now = new Date()
  const year = now.getFullYear()
  const mon = String(now.getMonth() + 1).padStart(2, '0')
  const startDate = `${year}-${mon}-01`
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
  const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`
  const currentMonth = `${year}-${mon}`

  const cartoes = db.prepare(`
    SELECT id, nome, banco, banco_key, limite, melhor_data_compra, vencimento FROM cartoes ORDER BY nome ASC
  `).all() as any[]

  return cartoes.map(c => {
    const mesesPagos = new Set(
      (db.prepare(`SELECT mes FROM faturas WHERE cartao_id = ? AND pago = 1`).all([c.id]) as any[]).map(r => r.mes)
    )

    // Avulsas do mês atual em diante, excluindo meses com fatura já paga
    const avulsas = db.prepare(`
      SELECT valor, data FROM transacoes
      WHERE tipo = 'despesa' AND cartao_id = ? AND fixa = 0 AND data >= ?
    `).all([c.id, startDate]) as { valor: number; data: string }[]

    let gastoTotal = 0
    for (const t of avulsas) {
      const mes = t.data.slice(0, 7)
      if (!mesesPagos.has(mes)) gastoTotal += t.valor
    }

    // Fixas e parceladas ativas, excluindo meses pagos
    const recorrentes = db.prepare(`
      SELECT valor, data_inicio, data_fim, parcelas FROM transacoes
      WHERE tipo = 'despesa' AND cartao_id = ? AND fixa = 1
        AND (data_fim IS NULL OR data_fim >= ?)
    `).all([c.id, startDate]) as { valor: number; data_inicio: string; data_fim: string | null; parcelas: number }[]

    for (const t of recorrentes) {
      if (t.parcelas > 0) {
        const [iy, im] = t.data_inicio.split('-').map(Number)
        const currentIndex = (year - iy) * 12 + (now.getMonth() + 1 - im)
        for (let i = Math.max(0, currentIndex); i < t.parcelas; i++) {
          const parcelaMes = `${iy + Math.floor((im - 1 + i) / 12)}-${String(((im - 1 + i) % 12) + 1).padStart(2, '0')}`
          if (!mesesPagos.has(parcelaMes)) gastoTotal += t.valor
        }
      } else {
        if (!mesesPagos.has(currentMonth)) gastoTotal += t.valor
      }
    }

    // Fatura do mês atual (para exibir no card)
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
