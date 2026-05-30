import db from '../../db/index'
import { faturaDateRange, getFaturaJanelaMap, getCartoesParaMes } from '../../utils/fatura'

interface FixaRow { valor: number; data_inicio: string; data_fim: string | null }
interface LimiteGlobal { tipo: 'fixo' | 'porcentagem'; valor: number; data_inicio: string }

function getMonthSpending(year: number, mon: number): number {
  const yearStr = String(year)
  const monStr = String(mon).padStart(2, '0')
  const startDate = `${yearStr}-${monStr}-01`
  const lastDay = new Date(year, mon, 0).getDate()
  const endDate = `${yearStr}-${monStr}-${String(lastDay).padStart(2, '0')}`
  const prevYear = mon === 1 ? year - 1 : year
  const prevMon = mon === 1 ? 12 : mon - 1
  const prevMonStr = `${prevYear}-${String(prevMon).padStart(2, '0')}`
  const cartoes = getCartoesParaMes(`${yearStr}-${monStr}`)

  let total = 0

  const r1 = db.prepare(`SELECT COALESCE(SUM(valor), 0) as t FROM transacoes
    WHERE tipo = 'despesa' AND fixa = 0 AND cartao_id IS NULL AND data >= ? AND data <= ?`
  ).get([startDate, endDate]) as { t: number }
  total += r1.t

  const r2 = db.prepare(`SELECT COALESCE(SUM(valor), 0) as t FROM transacoes
    WHERE tipo = 'despesa' AND fixa = 1 AND cartao_id IS NULL
      AND data_inicio <= ? AND (data_fim IS NULL OR data_fim >= ?)`
  ).get([endDate, startDate]) as { t: number }
  total += r2.t

  const janelaMap = getFaturaJanelaMap(`${yearStr}-${monStr}`)
  for (const c of cartoes) {
    const { startDate: fStart, endDate: fEnd } = janelaMap.get(c.id) ?? faturaDateRange(year, mon, c.melhor_data_compra)
    const r = db.prepare(`SELECT COALESCE(SUM(valor), 0) as t FROM transacoes
      WHERE tipo = 'despesa' AND fixa = 0 AND cartao_id = ? AND data >= ? AND data <= ?`
    ).get([c.id, fStart, fEnd]) as { t: number }
    total += r.t
  }

  for (const c of cartoes) {
    const cutoff = c.melhor_data_compra
    const rows = db.prepare(`SELECT valor, data_inicio, data_fim FROM transacoes
      WHERE tipo = 'despesa' AND fixa = 1 AND cartao_id = ?
        AND data_inicio <= ? AND (data_fim IS NULL OR data_fim >= ?)`
    ).all([c.id, endDate, startDate]) as FixaRow[]
    for (const t of rows) {
      const dayP = parseInt(t.data_inicio.slice(8, 10), 10)
      const calcMonth = cutoff > 1 && dayP >= cutoff ? prevMonStr : `${yearStr}-${monStr}`
      const effDate = effectiveDate(calcMonth, t.data_inicio)
      if (effDate < t.data_inicio) continue
      if (t.data_fim && effDate > t.data_fim) continue
      total += t.valor
    }
  }

  // Ajustes de faturas (positivos ou negativos) e extornos — mesma lógica do dashboard
  const monthStr = `${yearStr}-${monStr}`
  const totalAjustes = (db.prepare(
    `SELECT COALESCE(SUM(valor_ajuste), 0) AS t FROM faturas WHERE mes = ?`
  ).get([monthStr]) as { t: number }).t

  const totalExtornos = (db.prepare(
    `SELECT COALESCE(SUM(valor), 0) AS t FROM extornos WHERE mes = ?`
  ).get([monthStr]) as { t: number }).t

  return total + totalAjustes - totalExtornos
}

function getMonthIncome(year: number, mon: number): number {
  const yearStr = String(year)
  const monStr = String(mon).padStart(2, '0')
  const startDate = `${yearStr}-${monStr}-01`
  const lastDay = new Date(year, mon, 0).getDate()
  const endDate = `${yearStr}-${monStr}-${String(lastDay).padStart(2, '0')}`

  const r1 = db.prepare(`SELECT COALESCE(SUM(valor), 0) as t FROM transacoes
    WHERE tipo = 'receita' AND fixa = 0 AND data >= ? AND data <= ?`
  ).get([startDate, endDate]) as { t: number }

  const r2 = db.prepare(`SELECT COALESCE(SUM(valor), 0) as t FROM transacoes
    WHERE tipo = 'receita' AND fixa = 1
      AND data_inicio <= ? AND (data_fim IS NULL OR data_fim >= ?)`
  ).get([endDate, startDate]) as { t: number }

  return r1.t + r2.t
}

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const now = new Date()
  const nowMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const month = (typeof query.month === 'string' && query.month) ? query.month : nowMonth

  const [year, mon] = month.split('-').map(Number)
  const daysTotal = new Date(year, mon, 0).getDate()

  let daysElapsed: number
  if (month < nowMonth) {
    daysElapsed = daysTotal // mês passado — já encerrado
  } else if (month > nowMonth) {
    daysElapsed = 0 // mês futuro — nada gasto ainda
  } else {
    daysElapsed = now.getDate() // mês atual
  }

  const daysRemaining = daysTotal - daysElapsed

  const spent = getMonthSpending(year, mon)
  const income = getMonthIncome(year, mon)

  const limiteRow = db.prepare(`
    SELECT tipo, valor, data_inicio FROM limite_global
    WHERE data_inicio <= ?
    ORDER BY data_inicio DESC LIMIT 1
  `).get(month) as LimiteGlobal | undefined

  let limit: number | null = null
  let limitType: 'fixo' | 'porcentagem' | null = null
  let savingsPct: number | null = null

  if (limiteRow) {
    limitType = limiteRow.tipo
    if (limiteRow.tipo === 'fixo') {
      limit = limiteRow.valor
    } else {
      savingsPct = limiteRow.valor
      limit = income > 0 ? income * (1 - limiteRow.valor / 100) : null
    }
  }

  const isCurrentMonth = month === nowMonth
  const remaining = limit !== null ? limit - spent : null
  const spentPct = limit !== null && limit > 0 ? (spent / limit) * 100 : null
  const daysPct = (daysElapsed / daysTotal) * 100

  // Ritmo só faz sentido no mês atual — para meses passados/futuros é null
  const pace = isCurrentMonth && spentPct !== null ? spentPct - daysPct : null

  const dailyAllowance = remaining !== null && daysRemaining > 0
    ? remaining / daysRemaining
    : null

  return {
    month,
    isCurrentMonth,
    daysElapsed,
    daysTotal,
    daysRemaining,
    daysPct,
    spent,
    income,
    limit,
    limitType,
    savingsPct,
    remaining,
    spentPct,
    pace,
    dailyAllowance,
  }
})
