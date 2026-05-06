import db from '../../db/index'
import { readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tipo, referencia, mes, valor, recorrente = 0 } = body

  const result = db.prepare(`
    INSERT OR REPLACE INTO limites (tipo, referencia, mes, valor, recorrente)
    VALUES (?, ?, ?, ?, ?)
  `).run([tipo, referencia, mes, valor, recorrente ? 1 : 0])

  return db.prepare(`SELECT * FROM limites WHERE id = ?`).get(result.lastInsertRowid)
})
