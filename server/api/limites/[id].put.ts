import db from '../../db/index'
import { getRouterParam, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { valor, recorrente } = body

  db.prepare(`UPDATE limites SET valor = ?, recorrente = ? WHERE id = ?`).run([valor, recorrente ? 1 : 0, id])

  return db.prepare(`SELECT * FROM limites WHERE id = ?`).get(id)
})
