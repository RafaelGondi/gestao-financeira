import db from '../../db/index'
import { getRouterParam } from 'h3'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id))
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })

  const snapshot = db.prepare('SELECT * FROM snapshots WHERE id = ?').get([id]) as any
  if (!snapshot)
    throw createError({ statusCode: 404, statusMessage: 'Snapshot não encontrado' })

  const dados = db.prepare(`
    SELECT mes, patrimonio, receitas, despesas, saldo_mes
    FROM snapshot_dados WHERE snapshot_id = ? ORDER BY mes ASC
  `).all([id]) as any[]

  return { ...snapshot, dados }
})
