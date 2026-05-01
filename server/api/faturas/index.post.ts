import db from '../../db/index'
import { readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { cartao_id, mes, conta_id, data_pagamento, valor_ajuste } = body

  if (!cartao_id || !mes || !/^\d{4}-\d{2}$/.test(mes))
    throw createError({ statusCode: 400, message: 'Dados inválidos' })
  if (!conta_id)
    throw createError({ statusCode: 400, message: 'Conta é obrigatória' })
  if (!data_pagamento)
    throw createError({ statusCode: 400, message: 'Data de pagamento é obrigatória' })

  const ajuste = Number(valor_ajuste) || 0

  db.prepare(`
    INSERT INTO faturas (cartao_id, mes, pago, conta_id, data_pagamento, valor_ajuste)
    VALUES (?, ?, 1, ?, ?, ?)
    ON CONFLICT(cartao_id, mes) DO UPDATE SET pago = 1, conta_id = ?, data_pagamento = ?, valor_ajuste = ?
  `).run([cartao_id, mes, conta_id, data_pagamento, ajuste, conta_id, data_pagamento, ajuste])

  return db.prepare(`SELECT * FROM faturas WHERE cartao_id = ? AND mes = ?`).get([cartao_id, mes])
})
