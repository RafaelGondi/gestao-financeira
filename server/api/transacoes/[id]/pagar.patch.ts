import db from '../../../db/index'
import { readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const id = Number(event.context.params?.id)
  if (!id || isNaN(id))
    throw createError({ statusCode: 400, message: 'ID inválido' })

  const body = await readBody(event)
  const today = new Date().toISOString().split('T')[0]
  const dataPagamento = body?.data_pagamento ?? today

  const transacao = db.prepare(`SELECT id, tipo, fixa FROM transacoes WHERE id = ?`).get([id]) as any
  if (!transacao)
    throw createError({ statusCode: 404, message: 'Transação não encontrada' })
  if (transacao.tipo !== 'despesa')
    throw createError({ statusCode: 400, message: 'Apenas despesas podem ser marcadas como pagas' })
  if (transacao.fixa)
    throw createError({ statusCode: 400, message: 'Despesas fixas são gerenciadas automaticamente' })

  db.prepare(`UPDATE transacoes SET pago = 1, data_pagamento = ? WHERE id = ?`).run([dataPagamento, id])

  return db.prepare(`SELECT * FROM transacoes WHERE id = ?`).get([id])
})
