import db from '../../db/index'
import { computeMonthTotals } from '../../utils/month-totals'
import { computeSaldoAnterior } from '../../utils/saldo-anterior'
import { getSaldoConta } from '../../utils/getSaldoConta'
import { localDateStr } from '../../utils/localDate'
import { fetchCdiAnual, computePatrimonioComRendimento } from '../../utils/cdi'

interface Cartao {
  id: number
  melhor_data_compra: number
}

const r2 = (n: number) => Math.round(n * 100) / 100
const CDI_MULTIPLICADOR = 1.05 // 105% do CDI

export default defineEventHandler(async () => {
  const cartoes = db.prepare('SELECT id, melhor_data_compra FROM cartoes').all() as Cartao[]

  const todayStr = localDateStr()
  const [currentYear, currentMon] = [Number(todayStr.slice(0, 4)), Number(todayStr.slice(5, 7))]

  const todasContas = db.prepare(`SELECT id FROM contas`).all() as { id: number }[]
  const saldoHoje = r2(todasContas.reduce((sum, c) => sum + getSaldoConta(c.id), 0))

  const results = []

  for (let i = 0; i < 18; i++) {
    let y = currentYear, m = currentMon + i
    while (m > 12) { m -= 12; y++ }

    const month = `${y}-${String(m).padStart(2, '0')}`
    const isPast = y < currentYear || (y === currentYear && m < currentMon)

    const saldoAnterior = computeSaldoAnterior(y, m, cartoes)
    const { totalReceitas: income, totalDespesas: expenses } = computeMonthTotals(y, m, cartoes)
    const balance = r2(income - expenses)
    const patrimonio = r2(saldoAnterior + balance)

    results.push({ month, income, expenses, balance, patrimonio, saldoAnterior, isCurrent: i === 0, isPast })
  }

  const cdiInfo = await fetchCdiAnual()
  const { patrimonios: patrimonioComJuros, taxaAnualEfetiva, taxaMensal } = computePatrimonioComRendimento(
    results,
    cdiInfo.cdiAnual,
    CDI_MULTIPLICADOR,
  )

  const meses = results.map((m, i) => ({
    ...m,
    patrimonioComJuros: patrimonioComJuros[i],
  }))

  return {
    saldoHoje,
    meses,
    rendimento: {
      multiplicadorCdi: 105,
      cdiAnual: cdiInfo.cdiAnual,
      taxaAnualEfetiva,
      taxaMensal: r2(taxaMensal * 100),
      dataReferencia: cdiInfo.dataReferencia,
      fonte: cdiInfo.fonte,
    },
  }
})
