import db from '../../db/index'
import { getRouterParam } from 'h3'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id))
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })

  const existing = db.prepare(`SELECT id FROM transacoes WHERE id = ? AND tipo = 'despesa'`).get([id])
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Despesa não encontrada' })

  db.prepare('DELETE FROM transacoes WHERE id = ?').run([id])
  return { success: true, id }
})
