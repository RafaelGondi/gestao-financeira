import db from '../../db/index'
import { readBody, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id))
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })

  if (!db.prepare(`SELECT id FROM contas WHERE id = ?`).get([id]))
    throw createError({ statusCode: 404, statusMessage: 'Conta não encontrada' })

  const body = await readBody(event)

  if (!body.nome?.trim())
    throw createError({ statusCode: 400, statusMessage: 'Nome é obrigatório' })
  if (!body.banco?.trim())
    throw createError({ statusCode: 400, statusMessage: 'Banco é obrigatório' })

  db.prepare(`
    UPDATE contas SET nome = ?, banco = ?, banco_key = ?, saldo_inicial = ? WHERE id = ?
  `).run([body.nome.trim(), body.banco.trim(), body.banco_key ?? '', body.saldo_inicial, id])

  return db.prepare(`SELECT * FROM contas WHERE id = ?`).get([id])
})
