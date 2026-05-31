import db from '../db/index'
import { faturaDateRange } from './fatura'
import { effectiveDate } from './dateUtils'

interface Cartao {
  id: number
  melhor_data_compra: number
}

const r2 = (n: number) => Math.round(n * 100) / 100

/**
 * Computes total income and expenses for a given month using the same logic
 * as the dashboard: credit card transactions are grouped by fatura month
 * (respecting melhor_data_compra cutoff), not by calendar month.
 */
export function computeMonthTotals(year: number, mon: number, cartoes: Cartao[]) {
  const monthStr = `${year}-${String(mon).padStart(2, '0')}`
  const startDate = `${monthStr}-01`
  const lastDay = new Date(year, mon, 0).getDate()
  const endDate = `${monthStr}-${String(lastDay).padStart(2, '0')}`
  const prevY = mon === 1 ? year - 1 : year
  const prevM = mon === 1 ? 12 : mon - 1
  const prevMonStr = `${prevY}-${String(prevM).padStart(2, '0')}`

  // Non-card avulsas
  const avulsas = db.prepare(`
    SELECT valor, tipo FROM transacoes
    WHERE fixa = 0 AND cartao_id IS NULL AND data >= ? AND data <= ?
  `).all([startDate, endDate]) as { valor: number; tipo: string }[]

  // Non-card fixas/parceladas active this month
  const fixas = db.prepare(`
    SELECT valor, tipo FROM transacoes
    WHERE fixa = 1 AND cartao_id IS NULL
      AND data_inicio <= ? AND (data_fim IS NULL OR data_fim >= ?)
  `).all([endDate, startDate]) as { valor: number; tipo: string }[]

  let totalReceitas = 0
  let totalDespesas = 0
  for (const t of [...avulsas, ...fixas]) {
    if (t.tipo === 'receita') totalReceitas += t.valor
    else if (t.tipo === 'despesa') totalDespesas += t.valor
  }

  // Card avulsas — grouped by fatura month (respects melhor_data_compra)
  for (const c of cartoes) {
    const { startDate: fStart, endDate: fEnd } = faturaDateRange(year, mon, c.melhor_data_compra)
    const rows = db.prepare(`
      SELECT valor FROM transacoes
      WHERE tipo = 'despesa' AND fixa = 0 AND cartao_id = ? AND data >= ? AND data <= ?
    `).all([c.id, fStart, fEnd]) as { valor: number }[]
    totalDespesas += rows.reduce((s, r) => s + r.valor, 0)

    // Card fixas/parceladas — with melhor_data_compra cutoff applied
    // Usa a janela da fatura (fStart/fEnd), não o calendário do mês (startDate/endDate).
    // Parceladas com data_fim dentro da janela mas antes do início do mês calendário
    // (ex: última parcela em abril numa fatura que vai de abr/09 a mai/08) seriam
    // excluídas incorretamente se usássemos startDate — causando gap com o saldo bancário.
    const fixasCartao = db.prepare(`
      SELECT valor, data_inicio, data_fim FROM transacoes
      WHERE tipo = 'despesa' AND fixa = 1 AND cartao_id = ?
        AND data_inicio <= ? AND (data_fim IS NULL OR data_fim >= ?)
    `).all([c.id, fEnd, fStart]) as any[]

    for (const t of fixasCartao) {
      const dayP = parseInt(t.data_inicio.slice(8, 10), 10)
      const calcMonth = c.melhor_data_compra > 1 && dayP >= c.melhor_data_compra ? prevMonStr : monthStr
      const effDate = effectiveDate(calcMonth, t.data_inicio)
      if (effDate < t.data_inicio) continue
      if (t.data_fim && effDate > t.data_fim) continue
      totalDespesas += t.valor
    }

    // Extornos do cartão neste mês reduzem o total de despesas
    const extornos = db.prepare(`
      SELECT COALESCE(SUM(valor), 0) AS total FROM extornos
      WHERE cartao_id = ? AND mes = ?
    `).get([c.id, monthStr]) as { total: number }
    totalDespesas -= extornos.total

    // Ajuste da fatura deste cartão neste mês
    const ajusteRow = db.prepare(`
      SELECT COALESCE(valor_ajuste, 0) AS ajuste FROM faturas
      WHERE cartao_id = ? AND mes = ?
    `).get([c.id, monthStr]) as { ajuste: number } | undefined
    totalDespesas += ajusteRow?.ajuste ?? 0
  }

  return { totalReceitas: r2(totalReceitas), totalDespesas: r2(totalDespesas) }
}
