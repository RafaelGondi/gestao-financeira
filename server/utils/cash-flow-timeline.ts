import db from '../db/index'
import { effectiveDate } from './dateUtils'
import { getCartoesParaMes } from './cartoes'
import { getPatrimonioIncluidoTotal, lastDayOfPreviousMonth, computeSaldoGeral } from './patrimonio-totais'
import { getSaldoBancarioTotal } from './getSaldoConta'
import { localDateStr } from './localDate'
import { faturaDateRange, calcFaturaMonth } from './fatura'
import { isReceitaAvulsaRecebida, isDespesaAvulsaPaga, isFixaLiquidada, isEventoRealizado, resolveEventDate } from './liquidacao'

const r2 = (n: number) => Math.round(n * 100) / 100

export interface CashFlowEvent {
  descricao: string
  valor: number
  tipo: 'receita' | 'despesa' | 'fatura' | 'transferencia'
  realizado: boolean
  /** Não altera patrimônio consolidado (ex.: reserva incluída nos totais). */
  neutro?: boolean
  /** Movimento entre contas — compensa no total bancário, não é despesa/receita real. */
  interno?: boolean
  /** Entrada (+) vs saída (−) para exibição. */
  entrada?: boolean
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
  /** Reservas/patrimônio marcadas "incluir nos totais" (referência hoje). */
  patrimonioIncluidoHoje: number
  /** Projeção só contas (sem reservas), alinhada ao previsto do dashboard. */
  saldoFimMesContas: number
  dias: CashFlowDay[]
}

interface RawEvent {
  date: string
  amount: number
  descricao: string
  tipo: 'receita' | 'despesa' | 'fatura' | 'transferencia'
  realizado: boolean
  /** Transferência para patrimônio incluído nos totais — não altera patrimônio geral */
  neutro?: boolean
  /** Transferência entre contas — par compensado, não é saída líquida do sistema */
  interno?: boolean
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
    SELECT descricao, valor, data, pago, despago, data_pagamento
    FROM transacoes
    WHERE tipo = 'receita' AND fixa = 0 AND cartao_id IS NULL AND conta_id IS NOT NULL
      AND data >= ? AND data <= ?
  `).all([startDate, endDate]) as {
    descricao: string; valor: number; data: string; pago: number; despago: number; data_pagamento: string | null
  }[]

  for (const t of recAvulsas) {
    const liquidado = isReceitaAvulsaRecebida(t, today)
    const { date } = resolveEventDate(t.data, t.data_pagamento, liquidado, today)
    pushIfInMonth({
      date,
      amount: t.valor,
      descricao: t.descricao,
      tipo: 'receita',
      realizado: isEventoRealizado(liquidado, date, today),
    })
  }

  // Despesas avulsas (conta bancária, sem cartão)
  const despAvulsas = db.prepare(`
    SELECT descricao, valor, data, pago, despago, data_pagamento
    FROM transacoes
    WHERE tipo = 'despesa' AND fixa = 0 AND cartao_id IS NULL AND conta_id IS NOT NULL
      AND data >= ? AND data <= ?
  `).all([startDate, endDate]) as {
    descricao: string; valor: number; data: string; pago: number; despago: number; data_pagamento: string | null
  }[]

  for (const t of despAvulsas) {
    const liquidado = isDespesaAvulsaPaga(t, today)
    const { date } = resolveEventDate(t.data, t.data_pagamento, liquidado, today)
    pushIfInMonth({
      date,
      amount: -t.valor,
      descricao: t.descricao,
      tipo: 'despesa',
      realizado: isEventoRealizado(liquidado, date, today),
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
    const scheduled = effectiveDate(month, t.data_inicio)
    const liquidado = isFixaLiquidada(t, scheduled, today)
    const { date } = resolveEventDate(scheduled, t.data_pagamento, liquidado, today)
    const sign = t.tipo === 'receita' ? 1 : -1
    pushIfInMonth({
      date,
      amount: sign * t.valor,
      descricao: t.descricao,
      tipo: t.tipo === 'receita' ? 'receita' : 'despesa',
      realizado: isEventoRealizado(liquidado, date, today),
    })
  }

  const fixasLiquidadasTarde = db.prepare(`
    SELECT t.descricao, t.valor, t.tipo, pf.data_pagamento
    FROM pagamentos_fixas pf
    JOIN transacoes t ON t.id = pf.transacao_id
    WHERE t.fixa = 1 AND t.cartao_id IS NULL AND t.conta_id IS NOT NULL
      AND pf.nao_pago = 0
      AND pf.data_pagamento >= ? AND pf.data_pagamento <= ?
      AND pf.mes != ?
  `).all([startDate, endDate, month]) as {
    descricao: string; valor: number; tipo: string; data_pagamento: string
  }[]

  for (const t of fixasLiquidadasTarde) {
    const sign = t.tipo === 'receita' ? 1 : -1
    pushIfInMonth({
      date: t.data_pagamento,
      amount: sign * t.valor,
      descricao: t.descricao,
      tipo: t.tipo === 'receita' ? 'receita' : 'despesa',
      realizado: t.data_pagamento <= today,
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

  // Transferências entre contas e aportes para patrimônio (saída da conta de origem)
  const transferenciasSaida = db.prepare(`
    SELECT tr.descricao, tr.valor, tr.data, co.nome AS conta_origem_nome,
      cd.nome AS conta_destino_nome, pe.nome AS patrimonio_destino_nome,
      pe.incluir_em_totais
    FROM transferencias tr
    JOIN contas co ON co.id = tr.conta_origem_id
    LEFT JOIN contas cd ON cd.id = tr.conta_destino_id
    LEFT JOIN patrimonio_externo pe ON pe.id = tr.patrimonio_destino_id
    WHERE tr.conta_origem_id IS NOT NULL AND tr.data >= ? AND tr.data <= ?
  `).all([startDate, endDate]) as {
    descricao: string | null; valor: number; data: string
    conta_origem_nome: string; conta_destino_nome: string | null
    patrimonio_destino_nome: string | null; incluir_em_totais: number | null
  }[]

  for (const tr of transferenciasSaida) {
    const destino = tr.patrimonio_destino_nome ?? tr.conta_destino_nome ?? 'destino'
    const incluidoNosTotais = tr.patrimonio_destino_nome != null && tr.incluir_em_totais === 1
    const interno = tr.patrimonio_destino_nome == null && tr.conta_destino_nome != null
    pushIfInMonth({
      date: tr.data,
      amount: -tr.valor,
      descricao: tr.descricao || `Transferência para ${destino}`,
      tipo: 'transferencia',
      realizado: tr.data <= today,
      neutro: incluidoNosTotais,
      interno,
    })
  }

  // Entrada em conta (transferências entre contas — compensa a saída na origem)
  const transferenciasEntrada = db.prepare(`
    SELECT tr.descricao, tr.valor, tr.data, co.nome AS conta_origem_nome
    FROM transferencias tr
    JOIN contas cd ON cd.id = tr.conta_destino_id
    LEFT JOIN contas co ON co.id = tr.conta_origem_id
    WHERE tr.conta_destino_id IS NOT NULL
      AND tr.patrimonio_origem_id IS NULL
      AND tr.data >= ? AND tr.data <= ?
  `).all([startDate, endDate]) as {
    descricao: string | null; valor: number; data: string; conta_origem_nome: string | null
  }[]

  for (const tr of transferenciasEntrada) {
    const interno = tr.conta_origem_nome != null
    pushIfInMonth({
      date: tr.data,
      amount: tr.valor,
      descricao: tr.descricao || `Transferência de ${tr.conta_origem_nome ?? 'origem'}`,
      tipo: 'transferencia',
      realizado: tr.data <= today,
      interno,
    })
  }

  // Saques do patrimônio para conta (entrada na conta de destino)
  const transferenciasSaque = db.prepare(`
    SELECT tr.descricao, tr.valor, tr.data,
      cd.nome AS conta_destino_nome, pe.nome AS patrimonio_origem_nome,
      pe.incluir_em_totais
    FROM transferencias tr
    JOIN contas cd ON cd.id = tr.conta_destino_id
    JOIN patrimonio_externo pe ON pe.id = tr.patrimonio_origem_id
    WHERE tr.patrimonio_origem_id IS NOT NULL AND tr.data >= ? AND tr.data <= ?
  `).all([startDate, endDate]) as {
    descricao: string | null; valor: number; data: string
    conta_destino_nome: string; patrimonio_origem_nome: string; incluir_em_totais: number
  }[]

  for (const tr of transferenciasSaque) {
    const incluidoNosTotais = tr.incluir_em_totais === 1
    pushIfInMonth({
      date: tr.data,
      amount: tr.valor,
      descricao: tr.descricao || `Saque de ${tr.patrimonio_origem_nome}`,
      tipo: 'transferencia',
      realizado: tr.data <= today,
      neutro: incluidoNosTotais,
    })
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

  const prevMonthEnd = lastDayOfPreviousMonth(year, mon)
  // Saldo bancário real ao fim do mês anterior (mesma base do saldo por dia).
  const saldoInicialBancario = getSaldoBancarioTotal(prevMonthEnd)
  let bankProj = saldoInicialBancario
  const rawEvents = collectEvents(month, startDate, endDate, today)

  const patrimonioRef = (date: string) => getPatrimonioIncluidoTotal(date <= today ? date : today)
  const saldoComReservas = (bankSaldo: number, date: string) =>
    r2(bankSaldo + patrimonioRef(date))

  // Agrupa eventos por data
  const eventsByDate = new Map<string, RawEvent[]>()
  for (const e of rawEvents) {
    if (!eventsByDate.has(e.date)) eventsByDate.set(e.date, [])
    eventsByDate.get(e.date)!.push(e)
  }

  const dias: CashFlowDay[] = []
  const saldoInicial = saldoComReservas(saldoInicialBancario, prevMonthEnd)
  let saldo = saldoInicial
  let saldoMinimo = saldoInicial
  let saldoMinimoDia = 1
  let saldoMinimoDate: string | null = startDate
  let diasNegativos = 0
  let bankProjAtToday: number | null = null
  const saldoBancarioHoje = today >= startDate && today <= endDate ? getSaldoBancarioTotal(today) : null
  const patrimonioIncluidoHoje = getPatrimonioIncluidoTotal(today)

  for (let day = 1; day <= lastDay; day++) {
    const date = `${yearStr}-${monStr}-${String(day).padStart(2, '0')}`
    const dayEvents = eventsByDate.get(date) ?? []

    let entradas = 0
    let saidas = 0
    for (const e of dayEvents) {
      if (e.neutro || e.interno) {
        // Visível no detalhe, mas não entra em entradas/saídas do dia (movimento compensado)
      } else if (e.amount > 0) {
        entradas += e.amount
      } else {
        saidas += Math.abs(e.amount)
      }
      bankProj = r2(bankProj + e.amount)
    }

    let bankSaldo: number
    if (date <= today) {
      saldo = computeSaldoGeral(date)
      bankSaldo = getSaldoBancarioTotal(date)
      if (date === today) bankProjAtToday = bankProj
    } else if (saldoBancarioHoje != null && bankProjAtToday != null) {
      bankSaldo = r2(saldoBancarioHoje + (bankProj - bankProjAtToday))
      saldo = r2(computeSaldoGeral(today) + (bankSaldo - saldoBancarioHoje))
    } else {
      bankSaldo = bankProj
      saldo = saldoComReservas(bankProj, date)
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
        neutro: e.neutro,
        interno: e.interno,
        entrada: e.amount > 0,
      })),
      isPast: date < today,
      isToday: date === today,
      isNegative,
    })
  }

  const saldoAtualIdx = dias.findIndex(d => d.isToday)
  const saldoAtual = saldoAtualIdx >= 0 ? dias[saldoAtualIdx].saldo : (today > endDate ? dias[dias.length - 1].saldo : saldoInicial)
  const saldoFinal = dias[dias.length - 1]?.saldo ?? saldoInicial
  const saldoFinalBancario = bankProj

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
    saldoFimMesContas: r2(saldoFinalBancario),
    patrimonioIncluidoHoje,
    dias,
  }
}
