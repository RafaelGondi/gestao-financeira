import db from '../../db/index'
import { getRouterParam } from 'h3'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  db.prepare(`DELETE FROM patrimonio_externo WHERE id = ?`).run(id)
  return { ok: true }
})
