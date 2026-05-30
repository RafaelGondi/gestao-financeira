import db from '../db/index'

/**
 * Returns cartoes active for a given month string (YYYY-MM).
 * Includes archived cards that were still active during that month
 * (i.e. arquivado_a_partir_de > month, meaning they were replaced only later).
 */
export function getCartoesParaMes(mes: string) {
  return db.prepare(`
    SELECT * FROM cartoes
    WHERE arquivado = 0 OR arquivado IS NULL
       OR (arquivado = 1 AND arquivado_a_partir_de > ?)
    ORDER BY COALESCE(ordem, 999), nome ASC
  `).all([mes]) as any[]
}

/**
 * Computes the date range of transactions that belong to a given fatura month.
 *
 * Brazilian credit cards: purchases made on or after `melhorDataCompra` (cutoff day)
 * go to the NEXT month's bill. So fatura YYYY-MM covers:
 *   [prevMonth-cutoff, currentMonth-(cutoff-1)]
 *
 * e.g. cutoff=10, fatura=2025-05 → April 10 to May 9
 *
 * Cutoff day is clamped to the last valid day of each month to avoid invalid dates
 * (e.g. cutoff=30 in February → uses last day of February instead).
 */
export function faturaDateRange(year: number, month: number, cutoff: number) {
  if (cutoff <= 1) {
    const lastDay = new Date(year, month, 0).getDate()
    return {
      startDate: `${year}-${String(month).padStart(2, '0')}-01`,
      endDate: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    }
  }
  const prevYear = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1
  const lastDayOfPrevMonth = new Date(prevYear, prevMonth, 0).getDate()
  const lastDayOfCurrentMonth = new Date(year, month, 0).getDate()
  const startDay = Math.min(cutoff, lastDayOfPrevMonth)
  const endDay = Math.min(cutoff - 1, lastDayOfCurrentMonth)
  return {
    startDate: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
    endDate: `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
  }
}

/**
 * Given a transaction date string (YYYY-MM-DD) and a card's cutoff day,
 * returns the fatura month (YYYY-MM) this transaction belongs to.
 * Cutoff is clamped to last day of month to handle short months (e.g. February).
 */
export function transacaoFaturaMonth(dataStr: string, cutoff: number): string {
  if (cutoff <= 1) return dataStr.slice(0, 7)
  const [y, m, d] = dataStr.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const effectiveCutoff = Math.min(cutoff, lastDay)
  if (d < effectiveCutoff) {
    return `${y}-${String(m).padStart(2, '0')}`
  }
  const nextM = m === 12 ? 1 : m + 1
  const nextY = m === 12 ? y + 1 : y
  return `${nextY}-${String(nextM).padStart(2, '0')}`
}

/**
 * Pre-loads explicit fatura janela dates for all cartões that have a custom
 * window stored (e.g. transition faturas after a cutoff change).
 *
 * Returns a Map<cartaoId, {startDate, endDate}> for the given month.
 * Callers should fall back to faturaDateRange() when the cartão is not in the map.
 */
export function getFaturaJanelaMap(mesStr: string): Map<number, { startDate: string; endDate: string }> {
  const rows = db.prepare(
    'SELECT cartao_id, janela_inicio, janela_fim FROM faturas WHERE mes = ? AND janela_inicio IS NOT NULL AND janela_fim IS NOT NULL'
  ).all([mesStr]) as { cartao_id: number; janela_inicio: string; janela_fim: string }[]
  return new Map(rows.map(r => [r.cartao_id, { startDate: r.janela_inicio, endDate: r.janela_fim }]))
}
