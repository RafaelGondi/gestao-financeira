function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const total = (year * 12 + (month - 1)) + delta
  return { year: Math.floor(total / 12), month: (total % 12) + 1 }
}

function fmtMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

/**
 * Período de compras da fatura com vencimento no mês `month`.
 *
 * O dia de corte (`melhorDataCompra`) é o **fechamento**: compras até esse dia
 * (no mês anterior ao vencimento) entram nesta fatura.
 *
 * Ex.: corte=25, fatura 2026-08 (vence 01/ago) → 26/jun a 25/jul.
 */
export function faturaDateRange(year: number, month: number, cutoff: number) {
  if (cutoff <= 1) {
    const lastDay = new Date(year, month, 0).getDate()
    return {
      startDate: `${year}-${String(month).padStart(2, '0')}-01`,
      endDate: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    }
  }

  const end = addMonths(year, month, -1)
  const endLastDay = new Date(end.year, end.month, 0).getDate()
  const endDay = Math.min(cutoff, endLastDay)

  const start = addMonths(year, month, -2)
  const startLastDay = new Date(start.year, start.month, 0).getDate()
  const startDay = Math.min(cutoff + 1, startLastDay)

  return {
    startDate: `${fmtMonth(start.year, start.month)}-${String(startDay).padStart(2, '0')}`,
    endDate: `${fmtMonth(end.year, end.month)}-${String(endDay).padStart(2, '0')}`,
  }
}

/**
 * Mês de competência da parcela fixa ao visualizar a fatura `displayMonth`.
 */
export function calcFaturaMonth(
  dataInicio: string,
  cutoff: number,
  displayMonth: string,
  prevMonthStr: string,
): string {
  if (cutoff <= 1) return displayMonth

  const dayP = parseInt(dataInicio.slice(8, 10), 10)
  const [prevY, prevM] = prevMonthStr.split('-').map(Number)
  const prevLastDay = new Date(prevY, prevM, 0).getDate()
  const effectiveCutoff = Math.min(cutoff, prevLastDay)

  if (dayP <= effectiveCutoff) return prevMonthStr

  const prev2 = addMonths(prevY, prevM, -1)
  return fmtMonth(prev2.year, prev2.month)
}

/**
 * Mês da fatura (vencimento) em que uma compra cai.
 * Até o dia de fechamento → vence no mês seguinte; depois → dois meses à frente.
 */
export function transacaoFaturaMonth(dataStr: string, cutoff: number): string {
  if (cutoff <= 1) return dataStr.slice(0, 7)

  const [y, m, d] = dataStr.split('-').map(Number)
  const monthLastDay = new Date(y, m, 0).getDate()
  const effectiveCutoff = Math.min(cutoff, monthLastDay)

  const offset = d <= effectiveCutoff ? 1 : 2
  const target = addMonths(y, m, offset)
  return fmtMonth(target.year, target.month)
}
