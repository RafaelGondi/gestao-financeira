import db from '../../db/index'
import { readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const { tipo, valor, data_inicio } = await readBody(event)

  if (!['fixo', 'porcentagem'].includes(tipo)) throw createError({ statusCode: 400, message: 'tipo inválido' })
  if (typeof valor !== 'number' || valor <= 0) throw createError({ statusCode: 400, message: 'valor inválido' })
  if (!/^\d{4}-\d{2}$/.test(data_inicio)) throw createError({ statusCode: 400, message: 'data_inicio inválida' })

  const result = db.prepare(`
    INSERT INTO limite_global (tipo, valor, data_inicio)
    VALUES (?, ?, ?)
    ON CONFLICT(data_inicio) DO UPDATE SET tipo = excluded.tipo, valor = excluded.valor
  `).run([tipo, valor, data_inicio])

  return db.prepare(`SELECT * FROM limite_global WHERE id = ?`).get(result.lastInsertRowid)
    ?? db.prepare(`SELECT * FROM limite_global WHERE data_inicio = ?`).get(data_inicio)
})
