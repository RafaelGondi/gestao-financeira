import db from '../../db/index'
import { computeMonthTotals } from '../../utils/month-totals'
import { computeSaldoBancario } from '../../utils/saldo'

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

  // Saldo acumulado: começa no último dia do mês anterior à janela de 12 meses
  const firstD = new Date(today.getFullYear(), today.getMonth() - 11, 1)
  const baseY = firstD.getMonth() === 0 ? firstD.getFullYear() - 1 : firstD.getFullYear()
  const baseM = firstD.getMonth() === 0 ? 12 : firstD.getMonth()
  const baseLastDay = new Date(baseY, baseM, 0).getDate()
  const baseDate = `${baseY}-${String(baseM).padStart(2, '0')}-${String(baseLastDay).padStart(2, '0')}`
  let patrimonio = computeSaldoBancario(baseDate)

  const results = []

  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const year = d.getFullYear()
    const mon = d.getMonth() + 1
    const month = `${year}-${String(mon).padStart(2, '0')}`

    const { totalReceitas: income, totalDespesas: expenses } = computeMonthTotals(year, mon, cartoes)
    const balance = r2(income - expenses)
    patrimonio = r2(patrimonio + balance)

    results.push({ month, income, expenses, balance, patrimonio })
  }

  return results
})
