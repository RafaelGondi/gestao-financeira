import db from '../../db/index'
import { getRouterParam } from 'h3'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  db.prepare(`DELETE FROM transferencias WHERE id = ?`).run([id])
  return { ok: true }
})
