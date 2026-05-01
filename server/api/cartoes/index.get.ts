import db from '../../db/index'

interface Recorrente {
  valor: number
  data_inicio: string
  data_fim: string | null
  parcelas: number
}

function countRemainingParcelas(dataInicio: string, parcelas: number, now: Date): number {
  const [iy, im] = dataInicio.split('-').map(Number)
  const cy = now.getFullYear()
  const cm = now.getMonth() + 1
  const currentIndex = (cy - iy) * 12 + (cm - im) // índice 0-based do mês atual
  return Math.max(0, parcelas - currentIndex)
}

export default defineEventHandler(() => {
  const now = new Date()
  const year = now.getFullYear()
  const mon = String(now.getMonth() + 1).padStart(2, '0')
  const startDate = `${year}-${mon}-01`
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
  const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`

  const cartoes = db.prepare(`
    SELECT id, nome, banco, banco_key, limite, melhor_data_compra, vencimento FROM cartoes ORDER BY nome ASC
  `).all() as any[]

  return cartoes.map(c => {
    // Avulsas do mês atual em diante
    const avulsas = db.prepare(`
      SELECT COALESCE(SUM(valor), 0) AS total FROM transacoes
      WHERE tipo = 'despesa' AND cartao_id = ? AND fixa = 0 AND data >= ?
    `).get([c.id, startDate]) as { total: number }

    // Fixas e parceladas ativas no mês atual ou no futuro
    const recorrentes = db.prepare(`
      SELECT valor, data_inicio, data_fim, parcelas FROM transacoes
      WHERE tipo = 'despesa' AND cartao_id = ? AND fixa = 1
        AND (data_fim IS NULL OR data_fim >= ?)
    `).all([c.id, startDate]) as Recorrente[]

    let totalRecorrente = 0
    for (const t of recorrentes) {
      if (t.parcelas > 0) {
        // Parcelada: multiplica valor pelas parcelas restantes
        const restantes = countRemainingParcelas(t.data_inicio, t.parcelas, now)
        totalRecorrente += t.valor * restantes
      } else {
        // Fixa: conta só o mês atual (limite é liberado após pagamento a cada mês)
        totalRecorrente += t.valor
      }
    }

    // Fatura só do mês atual (para exibir separado da barra de limite total)
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
      gasto_mes: faturaRow.total,          // fatura do mês (para exibir no card)
      gasto_total: avulsas.total + totalRecorrente  // saldo comprometido total (para a barra)
    }
  })
})
