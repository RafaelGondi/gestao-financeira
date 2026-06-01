import db from '../../db/index'
import { computeMonthTotals } from '../../utils/month-totals'
import { computeSaldoBancario } from '../../utils/saldo'

interface Cartao {
  id: number
  melhor_data_compra: number
}

const r2 = (n: number) => Math.round(n * 100) / 100

export default defineEventHandler(() => {
  const cartoes = db.prepare('SELECT id, melhor_data_compra FROM cartoes').all() as Cartao[]

  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMon = today.getMonth() + 1

  // Ponto de partida: saldo bancário real hoje
  const todayStr = `${currentYear}-${String(currentMon).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  let patrimonio = computeSaldoBancario(todayStr)

  const results = []

  // Inclui o mês atual + próximos 17 meses (18 meses total)
  for (let i = 0; i < 18; i++) {
    let y = currentYear, m = currentMon + i
    while (m > 12) { m -= 12; y++ }

    const month = `${y}-${String(m).padStart(2, '0')}`
    const isPast = y < currentYear || (y === currentYear && m < currentMon)

    const { totalReceitas: income, totalDespesas: expenses } = computeMonthTotals(y, m, cartoes)
    const balance = r2(income - expenses)
    patrimonio = r2(patrimonio + balance)

    results.push({ month, income, expenses, balance, patrimonio, isCurrent: i === 0, isPast })
  }

  return results
})
