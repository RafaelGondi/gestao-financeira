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

  const maxOrdem = (db.prepare(`SELECT COALESCE(MAX(ordem), -1) AS m FROM contas`).get() as any).m
  const result = db.prepare(`
    INSERT INTO contas (nome, banco, banco_key, saldo_inicial, ordem)
    VALUES (?, ?, ?, ?, ?)
  `).run([body.nome.trim(), body.banco.trim(), body.banco_key ?? '', body.saldo_inicial, maxOrdem + 1])

  return db.prepare(`SELECT * FROM contas WHERE id = ?`).get([result.lastInsertRowid])
})
