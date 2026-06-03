import db from '../../db/index'
import { getRouterParam } from 'h3'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id))
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })

  const snapshot = db.prepare('SELECT id FROM snapshots WHERE id = ?').get([id])
  if (!snapshot)
    throw createError({ statusCode: 404, statusMessage: 'Snapshot não encontrado' })

  // snapshot_dados são deletados em cascade
  db.prepare('DELETE FROM snapshots WHERE id = ?').run([id])
  return { success: true }
})
