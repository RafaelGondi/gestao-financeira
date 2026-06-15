import db from '../db/index'
import { getSaldoConta } from './getSaldoConta'

interface MovimentoRow {
  id: number
  patrimonio_id: number
  tipo: string
  valor: number
  transferencia_id: number | null
}

function localDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getMovimentoByTransferencia(transferenciaId: number): MovimentoRow | undefined {
  return db.prepare(`
    SELECT id, patrimonio_id, tipo, valor, transferencia_id
    FROM patrimonio_movimentos WHERE transferencia_id = ?
  `).get(transferenciaId) as MovimentoRow | undefined
}

const r2 = (n: number) => Math.round(n * 100) / 100

function applyMovimentoToSaldo(saldo: number, mov: { tipo: string; valor: number }) {
  if (mov.tipo === 'aporte') return saldo + mov.valor
  if (mov.tipo === 'retirada') return saldo - mov.valor
  if (mov.tipo === 'ajuste') return mov.valor
  return saldo
}

function replayMovimentos(movs: { tipo: string; valor: number }[], opening: number) {
  let saldo = opening
  for (const m of movs) saldo = applyMovimentoToSaldo(saldo, m)
  return saldo
}

/** Saldo antes do primeiro movimento (abertura manual ou zero). */
function computeSaldoAbertura(
  allMovs: { tipo: string; valor: number }[],
  saldoAtual: number,
) {
  if (allMovs.length === 0) return saldoAtual
  if (allMovs.some(m => m.tipo === 'ajuste')) return 0
  return Math.max(0, r2(saldoAtual - replayMovimentos(allMovs, 0)))
}

/** Recalcula saldo_atual a partir dos movimentos (opcionalmente excluindo um que será apagado). */
export function recalcularSaldoPatrimonio(patrimonioId: number, excludeMovimentoId?: number) {
  const item = db.prepare(`
    SELECT saldo_atual FROM patrimonio_externo WHERE id = ?
  `).get(patrimonioId) as { saldo_atual: number } | undefined
  if (!item) return

  const allMovs = db.prepare(`
    SELECT id, tipo, valor FROM patrimonio_movimentos
    WHERE patrimonio_id = ?
    ORDER BY data ASC, id ASC
  `).all(patrimonioId) as { id: number; tipo: string; valor: number }[]

  const movs = excludeMovimentoId
    ? allMovs.filter(m => m.id !== excludeMovimentoId)
    : allMovs

  if (movs.length === 0) return

  const opening = computeSaldoAbertura(allMovs, item.saldo_atual)
  const saldo = r2(replayMovimentos(movs, opening))

  db.prepare(`UPDATE patrimonio_externo SET saldo_atual = ? WHERE id = ?`).run([saldo, patrimonioId])
}

export function revertPatrimonioMovimento(mov: Pick<MovimentoRow, 'id' | 'patrimonio_id' | 'tipo' | 'valor'>) {
  recalcularSaldoPatrimonio(mov.patrimonio_id, mov.id)
}

export function applyPatrimonioAporte(
  patrimonioId: number,
  transferenciaId: number,
  valor: number,
  data: string,
  notas?: string | null,
) {
  const item = db.prepare(`
    SELECT saldo_atual FROM patrimonio_externo WHERE id = ? AND ativo = 1
  `).get(patrimonioId) as { saldo_atual: number } | undefined
  if (!item) throw createError({ statusCode: 404, message: 'Item de patrimônio não encontrado' })

  db.prepare(`
    INSERT INTO patrimonio_movimentos (patrimonio_id, tipo, valor, data, notas, transferencia_id)
    VALUES (?, 'aporte', ?, ?, ?, ?)
  `).run([patrimonioId, valor, data, notas || null, transferenciaId])

  db.prepare(`UPDATE patrimonio_externo SET saldo_atual = ? WHERE id = ?`).run([item.saldo_atual + valor, patrimonioId])
}

export function assertSaldoOrigem(contaOrigemId: number, valor: number, excludeTransferenciaId?: number) {
  let saldo = getSaldoConta(contaOrigemId)
  if (excludeTransferenciaId) {
    const old = db.prepare(`
      SELECT valor, conta_origem_id, data FROM transferencias WHERE id = ?
    `).get(excludeTransferenciaId) as { valor: number; conta_origem_id: number; data: string } | undefined
    if (old?.conta_origem_id === contaOrigemId && old.data <= localDateStr()) {
      saldo += old.valor
    }
  }
  if (Math.round(valor * 100) > Math.round(saldo * 100)) {
    throw createError({
      statusCode: 422,
      message: `Saldo insuficiente. Disponível: R$ ${saldo.toFixed(2).replace('.', ',')}`,
    })
  }
}

export function applyPatrimonioRetirada(
  patrimonioId: number,
  transferenciaId: number,
  valor: number,
  data: string,
  notas?: string | null,
) {
  const item = db.prepare(`
    SELECT saldo_atual FROM patrimonio_externo WHERE id = ? AND ativo = 1
  `).get(patrimonioId) as { saldo_atual: number } | undefined
  if (!item) throw createError({ statusCode: 404, message: 'Item de patrimônio não encontrado' })

  if (Math.round(valor * 100) > Math.round(item.saldo_atual * 100)) {
    throw createError({
      statusCode: 422,
      message: `Saldo insuficiente no patrimônio. Disponível: R$ ${item.saldo_atual.toFixed(2).replace('.', ',')}`,
    })
  }

  db.prepare(`
    INSERT INTO patrimonio_movimentos (patrimonio_id, tipo, valor, data, notas, transferencia_id)
    VALUES (?, 'retirada', ?, ?, ?, ?)
  `).run([patrimonioId, valor, data, notas || null, transferenciaId])

  db.prepare(`UPDATE patrimonio_externo SET saldo_atual = ? WHERE id = ?`).run([item.saldo_atual - valor, patrimonioId])
}

export function assertSaldoPatrimonio(patrimonioId: number, valor: number, excludeTransferenciaId?: number) {
  const item = db.prepare(`
    SELECT saldo_atual FROM patrimonio_externo WHERE id = ? AND ativo = 1
  `).get(patrimonioId) as { saldo_atual: number } | undefined
  if (!item) throw createError({ statusCode: 404, message: 'Item de patrimônio não encontrado' })

  let saldo = item.saldo_atual
  if (excludeTransferenciaId) {
    const old = db.prepare(`
      SELECT valor, patrimonio_origem_id FROM transferencias WHERE id = ?
    `).get(excludeTransferenciaId) as { valor: number; patrimonio_origem_id: number | null } | undefined
    if (old?.patrimonio_origem_id === patrimonioId) {
      saldo += old.valor
    }
  }
  if (Math.round(valor * 100) > Math.round(saldo * 100)) {
    throw createError({
      statusCode: 422,
      message: `Saldo insuficiente no patrimônio. Disponível: R$ ${saldo.toFixed(2).replace('.', ',')}`,
    })
  }
}

export type TransferKind = 'conta-conta' | 'aporte' | 'saque'

export function getTransferKind(body: {
  conta_origem_id?: number | null
  conta_destino_id?: number | null
  patrimonio_destino_id?: number | null
  patrimonio_origem_id?: number | null
}): TransferKind | null {
  const temContaOrigem = !!body.conta_origem_id
  const temPatrimonioOrigem = !!body.patrimonio_origem_id
  const temContaDestino = !!body.conta_destino_id
  const temPatrimonioDestino = !!body.patrimonio_destino_id

  if (temContaOrigem && !temPatrimonioOrigem && temContaDestino && !temPatrimonioDestino) return 'conta-conta'
  if (temContaOrigem && !temPatrimonioOrigem && !temContaDestino && temPatrimonioDestino) return 'aporte'
  if (!temContaOrigem && temPatrimonioOrigem && temContaDestino && !temPatrimonioDestino) return 'saque'
  return null
}

export function getTransferKindFromRow(row: {
  patrimonio_destino_id: number | null
  patrimonio_origem_id: number | null
}): TransferKind {
  if (row.patrimonio_destino_id != null) return 'aporte'
  if (row.patrimonio_origem_id != null) return 'saque'
  return 'conta-conta'
}

export function assertPatrimonioDestino(patrimonioId: number) {
  const item = db.prepare(`SELECT id FROM patrimonio_externo WHERE id = ? AND ativo = 1`).get(patrimonioId)
  if (!item) throw createError({ statusCode: 404, message: 'Item de patrimônio não encontrado' })
}

export function deleteTransferenciaComPatrimonio(id: number) {
  const mov = getMovimentoByTransferencia(id)
  if (mov) {
    revertPatrimonioMovimento(mov)
    db.prepare(`DELETE FROM patrimonio_movimentos WHERE id = ?`).run(mov.id)
  }
  db.prepare(`DELETE FROM transferencias WHERE id = ?`).run(id)
}
