import db from '../../db/index'
import { faturaDateRange } from '../../utils/fatura'
import { localDateStr } from '../../utils/localDate'

interface Conta {
  id: number
  nome: string
  banco: string
  banco_key: string
  saldo_inicial: number
}

interface Transacao {
  valor: number
  tipo: string
  fixa: number
  data: string
  data_inicio: string | null
  data_fim: string | null
  pago: number
}

interface Transferencia {
  valor: number
  data: string
  conta_origem_id: number
  conta_destino_id: number
}

interface FaturaPaga {
  cartao_id: number
  mes: string
  conta_id: number
  data_pagamento: string
  valor_ajuste: number
  melhor_data_compra: number
}

// Conta quantas ocorrências de uma fixa já aconteceram até hoje (baseado em data)
function countReceivedOccurrences(dataInicio: string, dataFim: string | null, today: Date): number {
  const inicio = new Date(dataInicio + 'T12:00:00')
  const fim = dataFim ? new Date(dataFim + 'T12:00:00') : null
  const end = fim && fim < today ? fim : today

  let count = 0
  let current = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())

  while (current <= end) {
    count++
    current = new Date(inicio.getFullYear(), inicio.getMonth() + count, inicio.getDate())
  }

  return count
}

// Verifica se uma fixa foi marcada antecipadamente no mês atual
// (ocorrência ainda não chegou, mas já foi marcada em pagamentos_fixas)
function isMarkedEarlyThisMonth(transacaoId: number, dataInicio: string, todayStr: string): boolean {
  const todayMes = todayStr.slice(0, 7)
  const day = dataInicio.slice(8, 10)
  const occDate = `${todayMes}-${day}`
  if (occDate <= todayStr) return false // já ocorreu, não precisa de check
  const row = db.prepare(`SELECT 1 FROM pagamentos_fixas WHERE transacao_id = ? AND mes = ?`).get([transacaoId, todayMes])
  return row != null
}

export default defineEventHandler(() => {
  const contas = db.prepare(`
    SELECT id, nome, banco, banco_key, saldo_inicial FROM contas ORDER BY COALESCE(ordem, 999), nome ASC
  `).all() as Conta[]

  const today = new Date()
  today.setHours(23, 59, 59, 0)

  const transferencias = db.prepare(`
    SELECT valor, data, conta_origem_id, conta_destino_id FROM transferencias
  `).all() as Transferencia[]

  const faturasPagas = db.prepare(`
    SELECT f.cartao_id, f.mes, f.conta_id, f.data_pagamento, COALESCE(f.valor_ajuste, 0) AS valor_ajuste,
      c.melhor_data_compra
    FROM faturas f
    JOIN cartoes c ON c.id = f.cartao_id
    WHERE f.pago = 1
  `).all() as FaturaPaga[]

  return contas.map(conta => {
    const transacoes = db.prepare(`
      SELECT id, valor, tipo, fixa, data, data_inicio, data_fim, pago, despago
      FROM transacoes WHERE conta_id = ?
    `).all([conta.id]) as (Transacao & { id: number, despago: number })[]

    const todayStr = localDateStr()

    let movimentacao = 0

    for (const t of transacoes) {
      if (t.tipo === 'receita') {
        if (t.fixa) {
          const n = countReceivedOccurrences(t.data_inicio!, t.data_fim, today)
            + (isMarkedEarlyThisMonth(t.id, t.data_inicio!, todayStr) ? 1 : 0)
          movimentacao += t.valor * n
        } else if (t.pago || new Date(t.data + 'T12:00:00') <= today) {
          movimentacao += t.valor
        }
      } else if (t.tipo === 'despesa') {
        if (t.fixa) {
          // Conta mês a mês, pulando os meses explicitamente desmarcados (nao_pago)
          const naoPagoSet = new Set(
            (db.prepare(`SELECT mes FROM pagamentos_fixas WHERE transacao_id=? AND nao_pago=1`).all([t.id]) as any[])
              .map((r: any) => r.mes)
          )
          let count = 0
          const day = t.data_inicio!.slice(8, 10)
          let y = Number(t.data_inicio!.slice(0, 4)), m = Number(t.data_inicio!.slice(5, 7))
          while (true) {
            const mes = `${y}-${String(m).padStart(2, '0')}`
            const occDate = `${mes}-${day}`
            if (t.data_fim && new Date(occDate + 'T12:00:00') > new Date(t.data_fim + 'T12:00:00')) break
            if (new Date(occDate + 'T12:00:00') > today) break
            if (!naoPagoSet.has(mes)) count++
            m++; if (m > 12) { m = 1; y++ }
          }
          movimentacao -= t.valor * count
        } else if (!t.despago && new Date(t.data + 'T12:00:00') <= today) {
          movimentacao -= t.valor
        }
      }
    }

    for (const tr of transferencias) {
      if (new Date(tr.data + 'T12:00:00') > today) continue
      if (tr.conta_destino_id === conta.id) movimentacao += tr.valor
      if (tr.conta_origem_id === conta.id) movimentacao -= tr.valor
    }

    for (const f of faturasPagas) {
      if (f.conta_id !== conta.id) continue
      if (new Date(f.data_pagamento + 'T12:00:00') > today) continue
      const [year, mon] = f.mes.split('-').map(Number)
      const { startDate, endDate } = faturaDateRange(year, mon, f.melhor_data_compra)
      const row = db.prepare(`
        SELECT COALESCE(SUM(valor), 0) AS total FROM transacoes
        WHERE tipo = 'despesa' AND cartao_id = ?
          AND ((fixa = 0 AND data >= ? AND data <= ?)
            OR (fixa = 1 AND data_inicio <= ? AND (data_fim IS NULL OR data_fim >= ?)))
      `).get([f.cartao_id, startDate, endDate, endDate, startDate]) as { total: number }
      const extornos = db.prepare(`
        SELECT COALESCE(SUM(valor), 0) AS total FROM extornos WHERE cartao_id = ? AND mes = ?
      `).get([f.cartao_id, f.mes]) as { total: number }
      movimentacao -= row.total + f.valor_ajuste - extornos.total
    }

    return {
      ...conta,
      saldo_atual: Math.round((conta.saldo_inicial + movimentacao) * 100) / 100
    }
  })
})
