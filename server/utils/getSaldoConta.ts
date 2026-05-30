import db from '../db/index'
import { localDateStr } from './localDate'
import { effectiveDate } from './dateUtils'

/**
 * Computes the current real balance of a conta, accounting for all received
 * receitas, paid despesas (no-card), transfers, fixas, and paid faturas.
 */
export function getSaldoConta(contaId: number): number {
  const conta = db.prepare(`SELECT saldo_inicial FROM contas WHERE id = ?`).get([contaId]) as any
  if (!conta) return 0

  const today = localDateStr()

  // Receitas avulsas recebidas
  const recAvulsas = (db.prepare(`
    SELECT COALESCE(SUM(valor), 0) AS t FROM transacoes
    WHERE tipo='receita' AND conta_id=? AND fixa=0 AND (pago=1 OR data<=?)
  `).get([contaId, today]) as any).t

  // Despesas avulsas pagas (sem cartão) — exclui as explicitamente desmarcadas (despago=1)
  const despAvulsas = (db.prepare(`
    SELECT COALESCE(SUM(valor), 0) AS t FROM transacoes
    WHERE tipo='despesa' AND conta_id=? AND cartao_id IS NULL AND fixa=0 AND data<=? AND despago=0
  `).get([contaId, today]) as any).t

  // Transferências
  const trEntrada = (db.prepare(`SELECT COALESCE(SUM(valor),0) AS t FROM transferencias WHERE conta_destino_id=? AND data<=?`).get([contaId, today]) as any).t
  const trSaida   = (db.prepare(`SELECT COALESCE(SUM(valor),0) AS t FROM transferencias WHERE conta_origem_id=? AND data<=?`).get([contaId, today]) as any).t

  // Fixas (receita e despesa, sem cartão)
  const fixas = db.prepare(`
    SELECT id, tipo, valor, data_inicio, data_fim FROM transacoes
    WHERE conta_id=? AND fixa=1 AND cartao_id IS NULL
  `).all([contaId]) as any[]

  let fixasSaldo = 0
  for (const t of fixas) {
    let y = Number(t.data_inicio.slice(0, 4)), m = Number(t.data_inicio.slice(5, 7)), count = 0

    // Meses explicitamente marcados como não pagos (apenas despesas)
    const naoPagoMeses = t.tipo === 'despesa'
      ? new Set(
          (db.prepare(`SELECT mes FROM pagamentos_fixas WHERE transacao_id=? AND nao_pago=1`).all([t.id]) as any[])
            .map((r: any) => r.mes)
        )
      : new Set<string>()

    while (true) {
      const mes = `${y}-${String(m).padStart(2, '0')}`
      const occDate = effectiveDate(mes, t.data_inicio)
      if (t.data_fim && occDate > t.data_fim) break
      if (naoPagoMeses.has(mes)) {
        // explicitamente não pago — não conta, mas continua iterando
      } else {
        // For receitas only: check if marked early in pagamentos_fixas
        const isEarlyReceipt = t.tipo === 'receita' && occDate > today
          ? (db.prepare(`SELECT 1 FROM pagamentos_fixas WHERE transacao_id=? AND mes=?`).get([t.id, mes]) != null)
          : false
        if (occDate <= today || isEarlyReceipt) {
          count++
        } else {
          break
        }
      }
      m++; if (m > 12) { m = 1; y++ }
    }
    fixasSaldo += t.tipo === 'receita' ? count * t.valor : -(count * t.valor)
  }

  // Faturas pagas debitadas desta conta
  const faturas = db.prepare(`
    SELECT f.cartao_id, f.mes, COALESCE(f.valor_ajuste,0) AS valor_ajuste, cr.melhor_data_compra
    FROM faturas f JOIN cartoes cr ON cr.id=f.cartao_id
    WHERE f.conta_id=? AND f.pago=1 AND f.data_pagamento<=?
  `).all([contaId, today]) as any[]

  let faturasSaldo = 0
  for (const f of faturas) {
    const [fy, fm] = f.mes.split('-').map(Number)
    const c = f.melhor_data_compra as number
    const fStart = c <= 1
      ? `${fy}-${String(fm).padStart(2,'0')}-01`
      : `${fm === 1 ? fy - 1 : fy}-${String(fm === 1 ? 12 : fm - 1).padStart(2,'0')}-${String(c).padStart(2,'0')}`
    const fEnd = c <= 1
      ? `${fy}-${String(fm).padStart(2,'0')}-${String(new Date(fy, fm, 0).getDate()).padStart(2,'0')}`
      : `${fy}-${String(fm).padStart(2,'0')}-${String(c - 1).padStart(2,'0')}`
    const total = (db.prepare(`
      SELECT COALESCE(SUM(valor),0) AS t FROM transacoes
      WHERE tipo='despesa' AND cartao_id=?
        AND ((fixa=0 AND data>=? AND data<=?) OR (fixa=1 AND data_inicio<=? AND (data_fim IS NULL OR data_fim>=?)))
    `).get([f.cartao_id, fStart, fEnd, fEnd, fStart]) as any).t

    // Subtract extornos for this fatura
    const extornos = (db.prepare(`
      SELECT COALESCE(SUM(valor),0) AS t FROM extornos WHERE cartao_id=? AND mes=?
    `).get([f.cartao_id, f.mes]) as any).t

    faturasSaldo -= (total + f.valor_ajuste - extornos)
  }

  return Math.round((conta.saldo_inicial + recAvulsas - despAvulsas + trEntrada - trSaida + fixasSaldo + faturasSaldo) * 100) / 100
}
