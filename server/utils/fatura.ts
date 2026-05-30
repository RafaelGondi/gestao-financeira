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
  return {
    startDate: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(cutoff).padStart(2, '0')}`,
    endDate: `${year}-${String(month).padStart(2, '0')}-${String(cutoff - 1).padStart(2, '0')}`
  }
}

/**
 * Given a transaction date string (YYYY-MM-DD) and a card's cutoff day,
 * returns the fatura month (YYYY-MM) this transaction belongs to.
 */
export function transacaoFaturaMonth(dataStr: string, cutoff: number): string {
  if (cutoff <= 1) return dataStr.slice(0, 7)
  const [y, m, d] = dataStr.split('-').map(Number)
  if (d < cutoff) {
    return `${y}-${String(m).padStart(2, '0')}`
  }
  const nextM = m === 12 ? 1 : m + 1
  const nextY = m === 12 ? y + 1 : y
  return `${nextY}-${String(nextM).padStart(2, '0')}`
}
