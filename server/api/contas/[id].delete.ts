import db from '../../db/index'
import { getRouterParam } from 'h3'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id))
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })

  if (!db.prepare(`SELECT id FROM contas WHERE id = ?`).get([id]))
    throw createError({ statusCode: 404, statusMessage: 'Conta não encontrada' })

  db.prepare(`DELETE FROM contas WHERE id = ?`).run([id])
  return { success: true, id }
})
