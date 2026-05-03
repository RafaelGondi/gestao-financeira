import db from '../../db/index'
import { getRouterParam, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { valor } = body

  db.prepare(`UPDATE limites SET valor = ? WHERE id = ?`).run([valor, id])

  return db.prepare(`SELECT * FROM limites WHERE id = ?`).get(id)
})
