import db from '../../db/index'
import { readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  const body = await readBody(event)
  const ajuste = Number(body.valor_ajuste) || 0

  const fatura = db.prepare(`SELECT id FROM faturas WHERE id = ?`).get([id])
  if (!fatura) throw createError({ statusCode: 404, message: 'Fatura não encontrada' })

  db.prepare(`UPDATE faturas SET valor_ajuste = ? WHERE id = ?`).run([ajuste, id])

  return db.prepare(`
    SELECT f.*, c.nome AS conta_nome
    FROM faturas f LEFT JOIN contas c ON c.id = f.conta_id
    WHERE f.id = ?
  `).get([id])
})
