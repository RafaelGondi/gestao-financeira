import db from '../db/index'
import { localDateStr } from './localDate'
import { effectiveDate } from './dateUtils'
import { faturaDateRange } from './fatura'

const r2 = (n: number) => Math.round(n * 100) / 100

/**
 * Saldo real da conta: receitas/despesas avulsas, fixas (com pagamento antecipado),
 * transferências e faturas pagas. Mesma lógica da página de lançamentos da conta.
 */
export function getSaldoConta(contaId: number, cutoffStr?: string): number {
  const conta = db.prepare(`SELECT saldo_inicial FROM contas WHERE id = ?`).get([contaId]) as { saldo_inicial: number } | undefined
  if (!conta) return 0

  const cutoff = cutoffStr ?? localDateStr()
  let saldo = conta.saldo_inicial

  saldo += (db.prepare(`
    SELECT COALESCE(SUM(valor), 0) AS t FROM transacoes
    WHERE tipo='receita' AND conta_id=? AND fixa=0 AND data<=?
  `).get([contaId, cutoff]) as { t: number }).t

  saldo -= (db.prepare(`
    SELECT COALESCE(SUM(valor), 0) AS t FROM transacoes
    WHERE tipo='despesa' AND conta_id=? AND cartao_id IS NULL AND fixa=0 AND pago=1 AND despago=0
      AND COALESCE(data_pagamento, data) <= ?
  `).get([contaId, cutoff]) as { t: number }).t

  saldo += (db.prepare(`
    SELECT COALESCE(SUM(valor), 0) AS t FROM transferencias WHERE conta_destino_id=? AND data<=?
  `).get([contaId, cutoff]) as { t: number }).t
  saldo -= (db.prepare(`
    SELECT COALESCE(SUM(valor), 0) AS t FROM transferencias WHERE conta_origem_id=? AND data<=?
  `).get([contaId, cutoff]) as { t: number }).t

  for (const f of db.prepare(`
    SELECT f.cartao_id, f.mes, COALESCE(f.valor_ajuste, 0) AS valor_ajuste, cr.melhor_data_compra
    FROM faturas f JOIN cartoes cr ON cr.id = f.cartao_id
    WHERE f.conta_id=? AND f.pago=1 AND f.data_pagamento<=?
  `).all([contaId, cutoff]) as { cartao_id: number; mes: string; valor_ajuste: number; melhor_data_compra: number }[]) {
    const [fy, fm] = f.mes.split('-').map(Number)
    const { startDate, endDate } = faturaDateRange(fy, fm, f.melhor_data_compra)
    const total = (db.prepare(`
      SELECT COALESCE(SUM(valor), 0) AS t FROM transacoes
      WHERE tipo='despesa' AND cartao_id=?
        AND ((fixa=0 AND data>=? AND data<=?) OR (fixa=1 AND data_inicio<=? AND (data_fim IS NULL OR data_fim>=?)))
    `).get([f.cartao_id, startDate, endDate, endDate, startDate]) as { t: number }).t
    const extornos = (db.prepare(`
      SELECT COALESCE(SUM(valor), 0) AS t FROM extornos WHERE cartao_id=? AND mes=?
    `).get([f.cartao_id, f.mes]) as { t: number }).t
    saldo -= total + f.valor_ajuste - extornos
  }

  for (const t of db.prepare(`
    SELECT id, tipo, valor, data_inicio, data_fim, parcelas FROM transacoes
    WHERE conta_id=? AND fixa=1 AND cartao_id IS NULL
  `).all([contaId]) as { id: number; tipo: string; valor: number; data_inicio: string; data_fim: string | null; parcelas: number }[]) {
    const [iy, im] = t.data_inicio.split('-').map(Number)

    const earlyPaidByCutoff = new Set(
      (db.prepare(`
        SELECT mes FROM pagamentos_fixas
        WHERE transacao_id = ? AND nao_pago = 0 AND data_pagamento IS NOT NULL AND data_pagamento <= ?
      `).all([t.id, cutoff]) as { mes: string }[]).map(r => r.mes),
    )

    const naoPagoSet = new Set(
      (db.prepare(`
        SELECT mes FROM pagamentos_fixas WHERE transacao_id=? AND nao_pago=1
      `).all([t.id]) as { mes: string }[]).map(r => r.mes),
    )

    let count = 0
    let y = iy, m = im, idx = 0
    while (true) {
      if (t.parcelas > 0 && idx >= t.parcelas) break
      const mes = `${y}-${String(m).padStart(2, '0')}`
      const occDate = effectiveDate(mes, t.data_inicio)
      if (t.data_fim && occDate > t.data_fim) break

      if (naoPagoSet.has(mes)) {
        // explicitamente não pago
      } else if (occDate <= cutoff) {
        count++
      } else if (earlyPaidByCutoff.has(mes)) {
        count++
      } else {
        break
      }

      idx++
      m++
      if (m > 12) { m = 1; y++ }
    }

    if (t.tipo === 'receita') saldo += count * t.valor
    else saldo -= count * t.valor
  }

  return r2(saldo)
}

/** Soma do saldo real de todas as contas bancárias em uma data de corte. */
export function getSaldoBancarioTotal(cutoffStr?: string): number {
  const contas = db.prepare(`SELECT id FROM contas`).all() as { id: number }[]
  return r2(contas.reduce((sum, c) => sum + getSaldoConta(c.id, cutoffStr), 0))
}
