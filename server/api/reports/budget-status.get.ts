import db from '../../db/index'
import { faturaDateRange } from '../../utils/fatura'

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
  const cartoes = db.prepare(`SELECT id, melhor_data_compra FROM cartoes`).all() as { id: number; melhor_data_compra: number }[]

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

  for (const c of cartoes) {
    const { startDate: fStart, endDate: fEnd } = faturaDateRange(year, mon, c.melhor_data_compra)
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
      const effectiveDate = calcMonth + '-' + t.data_inicio.slice(8, 10)
      if (effectiveDate < t.data_inicio) continue
      if (t.data_fim && effectiveDate > t.data_fim) continue
      total += t.valor
    }
  }

  return total
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

export default defineEventHandler(() => {
  const now = new Date()
  const year = now.getFullYear()
  const mon = now.getMonth() + 1
  const daysElapsed = now.getDate()
  const daysTotal = new Date(year, mon, 0).getDate()
  const daysRemaining = daysTotal - daysElapsed
  const month = `${year}-${String(mon).padStart(2, '0')}`

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

  const remaining = limit !== null ? limit - spent : null
  const spentPct = limit !== null && limit > 0 ? (spent / limit) * 100 : null
  const daysPct = (daysElapsed / daysTotal) * 100

  // Ritmo: se gastasse uniformemente, estaria em daysPct% do limite
  // Acima disso = ritmo acelerado
  const pace = spentPct !== null ? spentPct - daysPct : null

  const dailyAllowance = remaining !== null && daysRemaining > 0
    ? remaining / daysRemaining
    : null

  return {
    month,
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
