import db from '../../db/index'
import { computeMonthTotals } from '../../utils/month-totals'
import { computeSaldoBancario } from '../../utils/saldo'
import { computeSaldoGeral, lastDayOfMonth } from '../../utils/patrimonio-totais'

interface Cartao {
  id: number
  melhor_data_compra: number
}

const r2 = (n: number) => Math.round(n * 100) / 100

export default defineEventHandler(() => {
  const cartoes = db.prepare(
    'SELECT id, melhor_data_compra FROM cartoes'
  ).all() as Cartao[]

  const today = new Date()
  const results = []

  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const year = d.getFullYear()
    const mon = d.getMonth() + 1
    const month = `${year}-${String(mon).padStart(2, '0')}`

    const { totalReceitas: income, totalDespesas: expenses } = computeMonthTotals(year, mon, cartoes)
    const balance = r2(income - expenses)
    const endDate = lastDayOfMonth(year, mon)
    const patrimonio = computeSaldoGeral(endDate)
    const patrimonioBancario = computeSaldoBancario(endDate)

    results.push({ month, income, expenses, balance, patrimonio, patrimonioBancario })
  }

  return results
})
