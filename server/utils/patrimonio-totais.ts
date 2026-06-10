import db from '../db/index'
import { computeSaldoBancario } from './saldo'
import { localDateStr } from './localDate'

const r2 = (n: number) => Math.round(n * 100) / 100

function hasPatrimonioTables(): boolean {
  const row = db.prepare(`
    SELECT 1 AS ok FROM sqlite_master
    WHERE type = 'table' AND name IN ('patrimonio_externo', 'patrimonio_movimentos')
    LIMIT 1
  `).get() as { ok: number } | undefined
  return !!row
}

/**
 * Soma o saldo dos itens de patrimônio marcados com incluir_em_totais=1 em uma data de corte.
 * Reconstrói o saldo histórico desfazendo movimentos posteriores ao corte.
 */
export function getPatrimonioIncluidoTotal(cutoffStr?: string): number {
  if (!hasPatrimonioTables()) return 0

  const cutoff = cutoffStr ?? localDateStr()

  const itens = db.prepare(`
    SELECT id, saldo_atual, created_at
    FROM patrimonio_externo
    WHERE ativo = 1 AND incluir_em_totais = 1
  `).all() as { id: number; saldo_atual: number; created_at: string }[]

  let total = 0
  for (const item of itens) {
    const createdDate = item.created_at.slice(0, 10)
    if (createdDate > cutoff) continue

    let saldo = item.saldo_atual
    const movsAfter = db.prepare(`
      SELECT tipo, valor FROM patrimonio_movimentos
      WHERE patrimonio_id = ? AND data > ?
      ORDER BY data DESC, id DESC
    `).all(item.id, cutoff) as { tipo: string; valor: number }[]

    for (const m of movsAfter) {
      if (m.tipo === 'aporte') saldo -= m.valor
      else if (m.tipo === 'retirada') saldo += m.valor
    }

    total += Math.max(0, saldo)
  }

  return r2(total)
}

/** Saldo bancário + patrimônio externo incluído nos totais gerais. */
export function computeSaldoGeral(cutoffStr?: string): number {
  const cutoff = cutoffStr ?? localDateStr()
  return r2(computeSaldoBancario(cutoff) + getPatrimonioIncluidoTotal(cutoff))
}

/** Último dia do mês anterior a year-mon. */
export function lastDayOfPreviousMonth(year: number, mon: number): string {
  const prevY = mon === 1 ? year - 1 : year
  const prevM = mon === 1 ? 12 : mon - 1
  const lastDay = new Date(prevY, prevM, 0).getDate()
  return `${prevY}-${String(prevM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

/** Último dia de year-mon. */
export function lastDayOfMonth(year: number, mon: number): string {
  const lastDay = new Date(year, mon, 0).getDate()
  return `${year}-${String(mon).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}
