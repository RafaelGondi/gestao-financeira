import db from '../../db/index'

export default defineEventHandler(() => {
  const now = new Date()
  const year = now.getFullYear()
  const mon = String(now.getMonth() + 1).padStart(2, '0')
  const startDate = `${year}-${mon}-01`
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
  const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`

  const cartoes = db.prepare(`SELECT id, nome, banco, banco_key, limite, melhor_data_compra, vencimento FROM cartoes ORDER BY nome ASC`).all() as any[]

  return cartoes.map(c => {
    const row = db.prepare(`
      SELECT COALESCE(SUM(valor), 0) AS gasto
      FROM transacoes
      WHERE tipo = 'despesa' AND cartao_id = ?
        AND (
          (fixa = 0 AND data >= ? AND data <= ?)
          OR
          (fixa = 1 AND data_inicio <= ? AND (data_fim IS NULL OR data_fim >= ?))
        )
    `).get([c.id, startDate, endDate, endDate, startDate]) as { gasto: number }

    return { ...c, gasto_mes: row.gasto }
  })
})
