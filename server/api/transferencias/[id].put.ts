import db from '../../db/index'
import { readBody, getRouterParam } from 'h3'
import {
  applyPatrimonioAporte,
  applyPatrimonioRetirada,
  assertPatrimonioDestino,
  assertSaldoOrigem,
  assertSaldoPatrimonio,
  getMovimentoByTransferencia,
  getTransferKind,
  getTransferKindFromRow,
  revertPatrimonioMovimento,
} from '../../utils/transferenciaPatrimonio'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const { descricao, valor, conta_origem_id, conta_destino_id, patrimonio_destino_id, patrimonio_origem_id, data } = body

  const v = Number(valor)
  const kind = getTransferKind(body)

  if (!v || v <= 0 || !data || !kind) {
    throw createError({ statusCode: 400, message: 'Dados inválidos' })
  }
  if (kind === 'conta-conta' && conta_origem_id === conta_destino_id) {
    throw createError({ statusCode: 400, message: 'Contas de origem e destino devem ser diferentes' })
  }

  const existing = db.prepare(`
    SELECT id, patrimonio_destino_id, patrimonio_origem_id FROM transferencias WHERE id = ?
  `).get(id) as { id: number; patrimonio_destino_id: number | null; patrimonio_origem_id: number | null } | undefined
  if (!existing) throw createError({ statusCode: 404, message: 'Transferência não encontrada' })

  if (getTransferKindFromRow(existing) !== kind) {
    throw createError({ statusCode: 400, message: 'Não é possível alterar o tipo da transferência' })
  }

  if (kind === 'conta-conta' || kind === 'aporte') assertSaldoOrigem(conta_origem_id, v, id)
  if (kind === 'aporte') assertPatrimonioDestino(patrimonio_destino_id)
  if (kind === 'saque') {
    assertPatrimonioDestino(patrimonio_origem_id)
    assertSaldoPatrimonio(patrimonio_origem_id, v, id)
  }

  db.transaction(() => {
    if (kind === 'aporte' || kind === 'saque') {
      const mov = getMovimentoByTransferencia(id)
      if (mov) {
        revertPatrimonioMovimento(mov)
        db.prepare(`DELETE FROM patrimonio_movimentos WHERE id = ?`).run(mov.id)
      }
    }

    db.prepare(`
      UPDATE transferencias
      SET descricao = ?, valor = ?, conta_origem_id = ?, conta_destino_id = ?,
          patrimonio_destino_id = ?, patrimonio_origem_id = ?, data = ?
      WHERE id = ?
    `).run([
      descricao || null,
      v,
      kind === 'saque' ? null : conta_origem_id,
      kind === 'aporte' ? null : conta_destino_id,
      kind === 'aporte' ? patrimonio_destino_id : null,
      kind === 'saque' ? patrimonio_origem_id : null,
      data,
      id,
    ])

    if (kind === 'aporte') {
      applyPatrimonioAporte(
        patrimonio_destino_id,
        id,
        v,
        data,
        descricao || 'Transferência da conta',
      )
    } else if (kind === 'saque') {
      applyPatrimonioRetirada(
        patrimonio_origem_id,
        id,
        v,
        data,
        descricao || 'Saque para conta',
      )
    }
  })()

  return { ok: true }
})
