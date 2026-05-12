import db from '../../db/index'
import { readBody } from 'h3'

// Cria ou atualiza apenas o valor_ajuste de uma fatura, sem exigir pagamento.
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { cartao_id, mes, valor_ajuste } = body

  if (!cartao_id || !mes || !/^\d{4}-\d{2}$/.test(mes))
    throw createError({ statusCode: 400, message: 'Dados inválidos' })

  const ajuste = Number(valor_ajuste) || 0

  db.prepare(`
    INSERT INTO faturas (cartao_id, mes, pago, valor_ajuste)
    VALUES (?, ?, 0, ?)
    ON CONFLICT(cartao_id, mes) DO UPDATE SET valor_ajuste = ?
  `).run([cartao_id, mes, ajuste, ajuste])

  return db.prepare(`
    SELECT f.*, c.nome AS conta_nome
    FROM faturas f LEFT JOIN contas c ON c.id = f.conta_id
    WHERE f.cartao_id = ? AND f.mes = ?
  `).get([cartao_id, mes])
})
