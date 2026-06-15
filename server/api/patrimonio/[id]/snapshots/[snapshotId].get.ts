import db from '../../../../db/index'
import { getRouterParam } from 'h3'

export default defineEventHandler((event) => {
  const patrimonioId = Number(getRouterParam(event, 'id'))
  const snapshotId = Number(getRouterParam(event, 'snapshotId'))
  if (!patrimonioId || !snapshotId)
    throw createError({ statusCode: 400, message: 'ID inválido' })

  const snapshot = db.prepare(`
    SELECT * FROM patrimonio_snapshots WHERE id = ? AND patrimonio_id = ?
  `).get(snapshotId, patrimonioId) as Record<string, unknown> | undefined

  if (!snapshot)
    throw createError({ statusCode: 404, message: 'Snapshot não encontrado' })

  const dados = db.prepare(`
    SELECT mes, saldo, month_index
    FROM patrimonio_snapshot_dados
    WHERE snapshot_id = ?
    ORDER BY month_index ASC, mes ASC
  `).all(snapshotId)

  return { ...snapshot, dados }
})
