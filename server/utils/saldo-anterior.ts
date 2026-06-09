import db from '../db/index'
import { computeSaldoBancario } from './saldo'
import { computeMonthTotals } from './month-totals'

interface Cartao {
  id: number
  melhor_data_compra: number
}

const r2 = (n: number) => Math.round(n * 100) / 100

/**
 * Saldo teórico acumulado ao início do mês (year, mon).
 * Itera mês a mês desde o primeiro mês com transações, garantindo que
 * saldoPrevisto(M) == saldoAnterior(M+1) para qualquer M.
 */
export function computeSaldoAnterior(year: number, mon: number, cartoes: Cartao[]): number {
  const { firstDate } = db.prepare(`
    SELECT MIN(d) AS firstDate FROM (
      SELECT data AS d FROM transacoes WHERE fixa = 0 AND data IS NOT NULL
      UNION ALL
      SELECT data_inicio AS d FROM transacoes WHERE fixa = 1 AND data_inicio IS NOT NULL
    )
  `).get() as { firstDate: string | null }

  if (!firstDate) {
    return computeSaldoBancario(
      `${year}-${String(mon === 1 ? 12 : mon - 1).padStart(2, '0')}-01`,
    )
  }

  const firstYear = Number(firstDate.slice(0, 4))
  const firstMon = Number(firstDate.slice(5, 7))

  const baseY = firstMon === 1 ? firstYear - 1 : firstYear
  const baseM = firstMon === 1 ? 12 : firstMon - 1
  const baseLastDay = new Date(baseY, baseM, 0).getDate()
  const baseDate = `${baseY}-${String(baseM).padStart(2, '0')}-${String(baseLastDay).padStart(2, '0')}`
  let saldo = computeSaldoBancario(baseDate)

  let iy = firstYear, im = firstMon
  while (iy < year || (iy === year && im < mon)) {
    const { totalReceitas, totalDespesas } = computeMonthTotals(iy, im, cartoes)
    saldo = r2(saldo + totalReceitas - totalDespesas)
    im++
    if (im > 12) { im = 1; iy++ }
  }

  return saldo
}
