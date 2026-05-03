import db from '../../db/index'
import { readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tipo, referencia, mes, valor } = body

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO limites (tipo, referencia, mes, valor)
    VALUES (?, ?, ?, ?)
  `)
  const result = stmt.run([tipo, referencia, mes, valor])

  return db.prepare(`SELECT * FROM limites WHERE id = ?`).get(result.lastInsertRowid)
})
