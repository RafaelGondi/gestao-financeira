import db from '../../db/index'
import { computeMonthTotals } from '../../utils/month-totals'

interface Cartao {
  id: number
  melhor_data_compra: number
}

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

    results.push({ month, income, expenses, balance: Math.round((income - expenses) * 100) / 100 })
  }

  return results
})
