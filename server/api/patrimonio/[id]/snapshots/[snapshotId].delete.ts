import db from '../../../../db/index'
import { getRouterParam } from 'h3'

export default defineEventHandler((event) => {
  const patrimonioId = Number(getRouterParam(event, 'id'))
  const snapshotId = Number(getRouterParam(event, 'snapshotId'))
  if (!patrimonioId || !snapshotId)
    throw createError({ statusCode: 400, message: 'ID inválido' })

  const snapshot = db.prepare(`
    SELECT id FROM patrimonio_snapshots WHERE id = ? AND patrimonio_id = ?
  `).get(snapshotId, patrimonioId)

  if (!snapshot)
    throw createError({ statusCode: 404, message: 'Snapshot não encontrado' })

  db.prepare('DELETE FROM patrimonio_snapshots WHERE id = ?').run(snapshotId)
  return { success: true }
})
