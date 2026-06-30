import db from '../../db/index'
import { getRouterParam, getQuery } from 'h3'
import { deleteFixaSingleOccurrence } from '../../utils/delete-fixa-occurrence'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  const { scope, month } = getQuery(event)

  if (!id || isNaN(id))
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })

  const row = db.prepare(`
    SELECT id, fixa, parcelas, data_inicio, data_fim, descricao, valor, categoria, conta_id, cartao_id
    FROM transacoes WHERE id = ? AND tipo = 'despesa'
  `).get([id]) as any

  if (!row)
    throw createError({ statusCode: 404, statusMessage: 'Despesa não encontrada' })

  if (!row.fixa || scope !== 'one' || !month || typeof month !== 'string') {
    db.prepare('DELETE FROM transacoes WHERE id = ?').run([id])
    return { success: true }
  }

  deleteFixaSingleOccurrence(row, month)
  return { success: true }
})
