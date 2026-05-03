import db from '../db/index'
import { faturaDateRange } from './fatura'

function countOccurrences(dataInicio: string, dataFim: string | null, cutoff: Date): number {
  const inicio = new Date(dataInicio + 'T12:00:00')
  const fim = dataFim ? new Date(dataFim + 'T12:00:00') : null
  const end = fim && fim < cutoff ? fim : cutoff
  let count = 0
  let cur = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())
  while (cur <= end) {
    count++
    cur = new Date(inicio.getFullYear(), inicio.getMonth() + count, inicio.getDate())
  }
  return count
}

// Saldo teórico acumulado: saldo_inicial + todas receitas − todas despesas até cutoffStr.
// Usado para "Saldo do Período Anterior" no dashboard, garantindo consistência com Saldo Previsto.
export function computeSaldoPrevisto(cutoffStr: string): number {
  const cutoff = new Date(cutoffStr + 'T23:59:59')

  const { saldoInicial } = db.prepare(
    `SELECT COALESCE(SUM(saldo_inicial), 0) AS saldoInicial FROM contas`
  ).get() as { saldoInicial: number }

  const { recAvulsa } = db.prepare(
    `SELECT COALESCE(SUM(valor), 0) AS recAvulsa FROM transacoes WHERE tipo = 'receita' AND fixa = 0 AND data <= ?`
  ).get([cutoffStr]) as { recAvulsa: number }

  const { despAvulsa } = db.prepare(
    `SELECT COALESCE(SUM(valor), 0) AS despAvulsa FROM transacoes WHERE tipo = 'despesa' AND fixa = 0 AND data <= ?`
  ).get([cutoffStr]) as { despAvulsa: number }

  const fixas = db.prepare(
    `SELECT valor, tipo, data_inicio, data_fim FROM transacoes WHERE fixa = 1`
  ).all() as { valor: number; tipo: string; data_inicio: string; data_fim: string | null }[]

  let fixaNet = 0
  for (const t of fixas) {
    const count = countOccurrences(t.data_inicio, t.data_fim, cutoff)
    fixaNet += (t.tipo === 'receita' ? 1 : -1) * Math.round(t.valor * count * 100) / 100
  }

  return Math.round((saldoInicial + recAvulsa - despAvulsa + fixaNet) * 100) / 100
}

export function computeSaldoBancario(cutoffStr: string): number {
  const cutoff = new Date(cutoffStr + 'T23:59:59')

  const contas = db.prepare(`SELECT id, saldo_inicial FROM contas`).all() as { id: number; saldo_inicial: number }[]
  const transferencias = db.prepare(
    `SELECT valor, data, conta_origem_id, conta_destino_id FROM transferencias`
  ).all() as { valor: number; data: string; conta_origem_id: number; conta_destino_id: number }[]
  const faturasPagas = db.prepare(`
    SELECT f.cartao_id, f.mes, f.conta_id, f.data_pagamento,
      COALESCE(f.valor_ajuste, 0) AS valor_ajuste, c.melhor_data_compra
    FROM faturas f JOIN cartoes c ON c.id = f.cartao_id WHERE f.pago = 1
  `).all() as { cartao_id: number; mes: string; conta_id: number; data_pagamento: string; valor_ajuste: number; melhor_data_compra: number }[]

  let total = 0
  for (const conta of contas) {
    const txs = db.prepare(
      `SELECT valor, tipo, fixa, data, data_inicio, data_fim FROM transacoes WHERE conta_id = ?`
    ).all([conta.id]) as { valor: number; tipo: string; fixa: number; data: string; data_inicio: string | null; data_fim: string | null }[]

    let mov = 0
    for (const t of txs) {
      const sign = t.tipo === 'receita' ? 1 : -1
      if (t.fixa) {
        mov += sign * Math.round(t.valor * countOccurrences(t.data_inicio!, t.data_fim, cutoff) * 100) / 100
      } else if (t.data <= cutoffStr) {
        mov += sign * t.valor
      }
    }
    for (const tr of transferencias) {
      if (tr.data > cutoffStr) continue
      if (tr.conta_destino_id === conta.id) mov += tr.valor
      if (tr.conta_origem_id === conta.id) mov -= tr.valor
    }
    for (const f of faturasPagas) {
      if (f.conta_id !== conta.id || f.data_pagamento > cutoffStr) continue
      const [fy, fm] = f.mes.split('-').map(Number)
      const { startDate: fStart, endDate: fEnd } = faturaDateRange(fy, fm, f.melhor_data_compra)
      const row = db.prepare(`
        SELECT COALESCE(SUM(valor), 0) AS total FROM transacoes
        WHERE tipo = 'despesa' AND cartao_id = ?
          AND ((fixa = 0 AND data >= ? AND data <= ?)
            OR (fixa = 1 AND data_inicio <= ? AND (data_fim IS NULL OR data_fim >= ?)))
      `).get([f.cartao_id, fStart, fEnd, fEnd, fStart]) as { total: number }
      mov -= row.total + f.valor_ajuste
    }
    total += conta.saldo_inicial + mov
  }
  return Math.round(total * 100) / 100
}
