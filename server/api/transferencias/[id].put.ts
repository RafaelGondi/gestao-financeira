import db from '../../db/index'
import { readBody, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { descricao, valor, conta_origem_id, conta_destino_id, data } = body

  if (!valor || valor <= 0 || !conta_origem_id || !conta_destino_id || !data) {
    throw createError({ statusCode: 400, message: 'Dados inválidos' })
  }
  if (conta_origem_id === conta_destino_id) {
    throw createError({ statusCode: 400, message: 'Contas de origem e destino devem ser diferentes' })
  }

  db.prepare(`
    UPDATE transferencias SET descricao = ?, valor = ?, conta_origem_id = ?, conta_destino_id = ?, data = ?
    WHERE id = ?
  `).run([descricao || null, Number(valor), conta_origem_id, conta_destino_id, data, id])

  return { ok: true }
})
