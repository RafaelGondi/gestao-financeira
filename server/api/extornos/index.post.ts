import db from '../../db/index'
import { readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const { cartao_id, mes, valor, descricao, notas, transacao_id } = await readBody(event)

  if (!cartao_id || !mes || !valor || valor <= 0)
    throw createError({ statusCode: 400, message: 'Dados inválidos' })

  const result = db.prepare(`
    INSERT INTO extornos (cartao_id, mes, valor, descricao, notas, transacao_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run([cartao_id, mes, Number(valor), descricao || null, notas || null, transacao_id || null])

  return db.prepare(`
    SELECT e.*, t.descricao AS transacao_descricao
    FROM extornos e
    LEFT JOIN transacoes t ON t.id = e.transacao_id
    WHERE e.id = ?
  `).get([result.lastInsertRowid])
})
