import db from '../../../db/index'
import { getRouterParam } from 'h3'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'aporteId'))
  db.prepare(`DELETE FROM meta_aportes WHERE id = ?`).run(id)
  return { ok: true }
})
