import db from '../../db/index'
import { readBody } from 'h3'
import {
  applyPatrimonioAporte,
  applyPatrimonioRetirada,
  assertPatrimonioDestino,
  assertSaldoOrigem,
  assertSaldoPatrimonio,
  getTransferKind,
} from '../../utils/transferenciaPatrimonio'

export default defineEventHandler(async (event) => {
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

  if (kind === 'conta-conta' || kind === 'aporte') assertSaldoOrigem(conta_origem_id, v)
  if (kind === 'aporte') assertPatrimonioDestino(patrimonio_destino_id)
  if (kind === 'saque') {
    assertPatrimonioDestino(patrimonio_origem_id)
    assertSaldoPatrimonio(patrimonio_origem_id, v)
  }

  const insert = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO transferencias (
        descricao, valor, conta_origem_id, conta_destino_id,
        patrimonio_destino_id, patrimonio_origem_id, data
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run([
      descricao || null,
      v,
      kind === 'saque' ? null : conta_origem_id,
      kind === 'aporte' ? null : conta_destino_id,
      kind === 'aporte' ? patrimonio_destino_id : null,
      kind === 'saque' ? patrimonio_origem_id : null,
      data,
    ])

    const transferenciaId = Number(result.lastInsertRowid)

    if (kind === 'aporte') {
      applyPatrimonioAporte(
        patrimonio_destino_id,
        transferenciaId,
        v,
        data,
        descricao || 'Transferência da conta',
      )
    } else if (kind === 'saque') {
      applyPatrimonioRetirada(
        patrimonio_origem_id,
        transferenciaId,
        v,
        data,
        descricao || 'Saque para conta',
      )
    }

    return transferenciaId
  })

  return { id: insert() }
})
