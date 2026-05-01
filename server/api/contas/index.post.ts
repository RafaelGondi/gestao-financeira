import db from '../../db/index'
import { readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.nome?.trim())
    throw createError({ statusCode: 400, statusMessage: 'Nome é obrigatório' })
  if (!body.banco?.trim())
    throw createError({ statusCode: 400, statusMessage: 'Banco é obrigatório' })
  if (typeof body.saldo_inicial !== 'number')
    throw createError({ statusCode: 400, statusMessage: 'Saldo inicial inválido' })

  const result = db.prepare(`
    INSERT INTO contas (nome, banco, banco_key, saldo_inicial)
    VALUES (?, ?, ?, ?)
  `).run([body.nome.trim(), body.banco.trim(), body.banco_key ?? '', body.saldo_inicial])

  return db.prepare(`SELECT * FROM contas WHERE id = ?`).get([result.lastInsertRowid])
})
