import db from '../db/index'
import { effectiveDate } from './dateUtils'
import { getCartoesParaMes } from './cartoes'
import { computeSaldoAnterior } from './saldo-anterior'
import { localDateStr } from './localDate'
import { faturaDateRange, calcFaturaMonth } from './fatura'

const r2 = (n: number) => Math.round(n * 100) / 100

export interface CashFlowEvent {
  descricao: string
  valor: number
  tipo: 'receita' | 'despesa' | 'fatura'
  realizado: boolean
}

export interface CashFlowDay {
  day: number
  date: string
  entradas: number
  saidas: number
  saldo: number
  eventos: CashFlowEvent[]
  isPast: boolean
  isToday: boolean
  isNegative: boolean
}

export interface CashFlowTimeline {
  month: string
  saldoInicial: number
  saldoAtual: number
  saldoFinal: number
  saldoMinimo: number
  saldoMinimoDia: number | null
  saldoMinimoDate: string | null
  diasNegativos: number
  saldoFimMes: number
  dias: CashFlowDay[]
}

interface RawEvent {
  date: string
  amount: number
  descricao: string
  tipo: 'receita' | 'despesa' | 'fatura'
  realizado: boolean
}

function resolveEventDate(
  scheduled: string,
  dataPagamento: string | null,
  isPaid: boolean,
  today: string,
): { date: string; realizado: boolean } {
  if (isPaid && dataPagamento) {
    return { date: dataPagamento, realizado: dataPagamento <= today }
  }
  return { date: scheduled, realizado: scheduled <= today }
}

function collectEvents(month: string, startDate: string, endDate: string, today: string): RawEvent[] {
  const events: RawEvent[] = []
  const [yearStr, monStr] = month.split('-')
  const year = Number(yearStr)
  const mon = Number(monStr)
  const prevYear = mon === 1 ? year - 1 : year
  const prevMon = mon === 1 ? 12 : mon - 1
  const prevMonStr = `${prevYear}-${String(prevMon).padStart(2, '0')}`

  const pushIfInMonth = (e: RawEvent) => {
    if (e.date >= startDate && e.date <= endDate) events.push(e)
  }

  // Receitas avulsas (conta bancária)
  const recAvulsas = db.prepare(`
    SELECT descricao, valor, data, pago, data_pagamento
    FROM transacoes
    WHERE tipo = 'receita' AND fixa = 0 AND cartao_id IS NULL AND conta_id IS NOT NULL
      AND data >= ? AND data <= ?
  `).all([startDate, endDate]) as {
    descricao: string; valor: number; data: string; pago: number; data_pagamento: string | null
  }[]

  for (const t of recAvulsas) {
    const isPaid = t.pago === 1 || t.data <= today
    const { date, realizado } = resolveEventDate(t.data, t.data_pagamento, isPaid, today)
    pushIfInMonth({
      date,
      amount: t.valor,
      descricao: t.descricao,
      tipo: 'receita',
      realizado,
    })
  }

  // Despesas avulsas (conta bancária, sem cartão)
  const despAvulsas = db.prepare(`
    SELECT descricao, valor, data, pago, despago, data_pagamento
    FROM transacoes
    WHERE tipo = 'despesa' AND fixa = 0 AND cartao_id IS NULL AND conta_id IS NOT NULL
      AND data >= ? AND data <= ? AND despago = 0
  `).all([startDate, endDate]) as {
    descricao: string; valor: number; data: string; pago: number; despago: number; data_pagamento: string | null
  }[]

  for (const t of despAvulsas) {
    const isPaid = t.pago === 1 || (t.data <= today && t.despago === 0)
    const { date, realizado } = resolveEventDate(t.data, t.data_pagamento, isPaid, today)
    pushIfInMonth({
      date,
      amount: -t.valor,
      descricao: t.descricao,
      tipo: 'despesa',
      realizado,
    })
  }

  // Fixas / parceladas (conta bancária, sem cartão)
  const fixas = db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.tipo, t.data_inicio, t.data_fim,
      pf.data_pagamento, pf.nao_pago
    FROM transacoes t
    LEFT JOIN pagamentos_fixas pf ON pf.transacao_id = t.id AND pf.mes = ?
    WHERE t.fixa = 1 AND t.cartao_id IS NULL AND t.conta_id IS NOT NULL
      AND t.data_inicio <= ? AND (t.data_fim IS NULL OR t.data_fim >= ?)
  `).all([month, endDate, startDate]) as {
    id: number; descricao: string; valor: number; tipo: string
    data_inicio: string; data_fim: string | null
    data_pagamento: string | null; nao_pago: number | null
  }[]

  for (const t of fixas) {
    if (t.nao_pago) continue
    const scheduled = effectiveDate(month, t.data_inicio)
    const isPaid = t.data_pagamento != null || scheduled <= today
    const { date, realizado } = resolveEventDate(scheduled, t.data_pagamento, isPaid, today)
    const sign = t.tipo === 'receita' ? 1 : -1
    pushIfInMonth({
      date,
      amount: sign * t.valor,
      descricao: t.descricao,
      tipo: t.tipo === 'receita' ? 'receita' : 'despesa',
      realizado,
    })
  }

  // Faturas de cartão (saída da conta bancária)
  const cartoes = getCartoesParaMes(month) as { id: number; nome: string; melhor_data_compra: number; vencimento: number }[]
  const faturasPagas = new Map<number, { data_pagamento: string }>(
    (db.prepare(`SELECT cartao_id, data_pagamento FROM faturas WHERE mes = ? AND pago = 1`).all([month]) as any[])
      .map((r: any) => [r.cartao_id, { data_pagamento: r.data_pagamento }])
  )

  for (const c of cartoes) {
    const { startDate: fStart, endDate: fEnd } = faturaDateRange(year, mon, c.melhor_data_compra)
    const avulsas = (db.prepare(`
      SELECT COALESCE(SUM(valor), 0) AS total FROM transacoes
      WHERE tipo = 'despesa' AND fixa = 0 AND cartao_id = ? AND data >= ? AND data <= ?
    `).get([c.id, fStart, fEnd]) as { total: number }).total

    let fixasTotal = 0
    const fixasCartao = db.prepare(`
      SELECT valor, data_inicio, data_fim FROM transacoes
      WHERE tipo = 'despesa' AND fixa = 1 AND cartao_id = ?
        AND data_inicio <= ? AND (data_fim IS NULL OR data_fim >= ?)
    `).all([c.id, fEnd, fStart]) as { valor: number; data_inicio: string; data_fim: string | null }[]

    for (const t of fixasCartao) {
      const calcMonth = calcFaturaMonth(t.data_inicio, c.melhor_data_compra, month, prevMonStr)
      const effDate = effectiveDate(calcMonth, t.data_inicio)
      if (effDate < t.data_inicio) continue
      if (t.data_fim && effDate > t.data_fim) continue
      fixasTotal += t.valor
    }

    const extornos = (db.prepare(`
      SELECT COALESCE(SUM(valor), 0) AS total FROM extornos WHERE cartao_id = ? AND mes = ?
    `).get([c.id, month]) as { total: number }).total

    const ajuste = (db.prepare(`
      SELECT COALESCE(valor_ajuste, 0) AS ajuste FROM faturas WHERE cartao_id = ? AND mes = ?
    `).get([c.id, month]) as { ajuste: number } | undefined)?.ajuste ?? 0

    const total = r2(avulsas + fixasTotal + ajuste - extornos)
    if (total <= 0) continue

    const pagoInfo = faturasPagas.get(c.id)
    const vencDay = Math.min(c.vencimento, new Date(year, mon, 0).getDate())
    const vencDate = `${month}-${String(vencDay).padStart(2, '0')}`

    if (pagoInfo) {
      pushIfInMonth({
        date: pagoInfo.data_pagamento,
        amount: -total,
        descricao: `Fatura ${c.nome}`,
        tipo: 'fatura',
        realizado: pagoInfo.data_pagamento <= today,
      })
    } else {
      pushIfInMonth({
        date: vencDate,
        amount: -total,
        descricao: `Fatura ${c.nome}`,
        tipo: 'fatura',
        realizado: false,
      })
    }
  }

  return events
}

export function computeCashFlowTimeline(month: string): CashFlowTimeline {
  const [yearStr, monStr] = month.split('-')
  const year = Number(yearStr)
  const mon = Number(monStr)
  const startDate = `${yearStr}-${monStr}-01`
  const lastDay = new Date(year, mon, 0).getDate()
  const endDate = `${yearStr}-${monStr}-${String(lastDay).padStart(2, '0')}`
  const today = localDateStr()

  const cartoes = getCartoesParaMes(month) as { id: number; melhor_data_compra: number }[]
  const saldoInicial = computeSaldoAnterior(year, mon, cartoes)
  const rawEvents = collectEvents(month, startDate, endDate, today)

  // Agrupa eventos por data
  const eventsByDate = new Map<string, RawEvent[]>()
  for (const e of rawEvents) {
    if (!eventsByDate.has(e.date)) eventsByDate.set(e.date, [])
    eventsByDate.get(e.date)!.push(e)
  }

  const dias: CashFlowDay[] = []
  let saldo = saldoInicial
  let saldoMinimo = saldoInicial
  let saldoMinimoDia = 1
  let saldoMinimoDate: string | null = startDate
  let diasNegativos = 0

  for (let day = 1; day <= lastDay; day++) {
    const date = `${yearStr}-${monStr}-${String(day).padStart(2, '0')}`
    const dayEvents = eventsByDate.get(date) ?? []

    let entradas = 0
    let saidas = 0
    for (const e of dayEvents) {
      if (e.amount > 0) entradas += e.amount
      else saidas += Math.abs(e.amount)
      saldo = r2(saldo + e.amount)
    }

    entradas = r2(entradas)
    saidas = r2(saidas)
    const isNegative = saldo < 0
    if (isNegative) diasNegativos++

    if (saldo <= saldoMinimo) {
      saldoMinimo = saldo
      saldoMinimoDia = day
      saldoMinimoDate = date
    }

    dias.push({
      day,
      date,
      entradas,
      saidas,
      saldo,
      eventos: dayEvents.map(e => ({
        descricao: e.descricao,
        valor: Math.abs(e.amount),
        tipo: e.tipo,
        realizado: e.realizado,
      })),
      isPast: date < today,
      isToday: date === today,
      isNegative,
    })
  }

  const saldoAtualIdx = dias.findIndex(d => d.isToday)
  const saldoAtual = saldoAtualIdx >= 0 ? dias[saldoAtualIdx].saldo : (today > endDate ? dias[dias.length - 1].saldo : saldoInicial)
  const saldoFinal = dias[dias.length - 1]?.saldo ?? saldoInicial

  return {
    month,
    saldoInicial: r2(saldoInicial),
    saldoAtual: r2(saldoAtual),
    saldoFinal: r2(saldoFinal),
    saldoMinimo: r2(saldoMinimo),
    saldoMinimoDia,
    saldoMinimoDate,
    diasNegativos,
    saldoFimMes: r2(saldoFinal),
    dias,
  }
}
