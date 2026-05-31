/**
 * Computes the date range of transactions that belong to a given fatura month.
 *
 * Brazilian credit cards: purchases made on or after `melhorDataCompra` (cutoff day)
 * go to the NEXT month's bill. So fatura YYYY-MM covers:
 *   [prevMonth-cutoff, currentMonth-(cutoff-1)]
 *
 * e.g. cutoff=10, fatura=2025-05 → April 10 to May 9
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
  const prevMonthLastDay = new Date(prevYear, prevMonth, 0).getDate()
  const currMonthLastDay = new Date(year, month, 0).getDate()
  const startDay = Math.min(cutoff, prevMonthLastDay)
  const endDay = Math.min(cutoff - 1, currMonthLastDay)
  return {
    startDate: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
    endDate: `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
  }
}

/**
 * Determines which fatura month a recurring transaction's occurrence belongs to,
 * given the display month. Clampeia o cutoff ao último dia do mês anterior para
 * evitar datas inválidas (ex: cutoff=31 em abril → trata como 30).
 */
export function calcFaturaMonth(
  dataInicio: string,
  cutoff: number,
  displayMonth: string,
  prevMonthStr: string
): string {
  if (cutoff <= 1) return displayMonth
  const dayP = parseInt(dataInicio.slice(8, 10), 10)
  const [prevY, prevM] = prevMonthStr.split('-').map(Number)
  const prevLastDay = new Date(prevY, prevM, 0).getDate()
  const clampedDayP = Math.min(dayP, prevLastDay)
  const effectiveCutoff = Math.min(cutoff, prevLastDay)
  return clampedDayP >= effectiveCutoff ? prevMonthStr : displayMonth
}

/**
 * Given a transaction date string (YYYY-MM-DD) and a card's cutoff day,
 * returns the fatura month (YYYY-MM) this transaction belongs to.
 */
export function transacaoFaturaMonth(dataStr: string, cutoff: number): string {
  if (cutoff <= 1) return dataStr.slice(0, 7)
  const [y, m, d] = dataStr.split('-').map(Number)
  // Clampeia o cutoff ao último dia do mês da transação (ex: cutoff=31 em abril → 30)
  const monthLastDay = new Date(y, m, 0).getDate()
  const effectiveCutoff = Math.min(cutoff, monthLastDay)
  if (d < effectiveCutoff) {
    return `${y}-${String(m).padStart(2, '0')}`
  }
  const nextM = m === 12 ? 1 : m + 1
  const nextY = m === 12 ? y + 1 : y
  return `${nextY}-${String(nextM).padStart(2, '0')}`
}
