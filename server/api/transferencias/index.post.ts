import db from '../../db/index'
import { readBody } from 'h3'
import { getSaldoConta } from '../../utils/getSaldoConta'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { descricao, valor, conta_origem_id, conta_destino_id, data } = body

  if (!valor || valor <= 0 || !conta_origem_id || !conta_destino_id || !data) {
    throw createError({ statusCode: 400, message: 'Dados inválidos' })
  }
  if (conta_origem_id === conta_destino_id) {
    throw createError({ statusCode: 400, message: 'Contas de origem e destino devem ser diferentes' })
  }

  const saldo = getSaldoConta(conta_origem_id)
  if (Math.round(Number(valor) * 100) > Math.round(saldo * 100)) {
    throw createError({ statusCode: 422, message: `Saldo insuficiente. Disponível: R$ ${saldo.toFixed(2).replace('.', ',')}` })
  }

  const result = db.prepare(`
    INSERT INTO transferencias (descricao, valor, conta_origem_id, conta_destino_id, data)
    VALUES (?, ?, ?, ?, ?)
  `).run([descricao || null, Number(valor), conta_origem_id, conta_destino_id, data])

  return { id: result.lastInsertRowid }
})
