import db from '../../../db/index'
import { readBody, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const meta_id = Number(getRouterParam(event, 'id'))
  const { valor, data, notas } = await readBody(event)
  const result = db.prepare(`
    INSERT INTO meta_aportes (meta_id, valor, data, notas)
    VALUES (?, ?, ?, ?)
  `).run([meta_id, valor, data, notas?.trim() || null])
  return db.prepare(`SELECT * FROM meta_aportes WHERE id = ?`).get(result.lastInsertRowid)
})
