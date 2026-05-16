import db from '../../../db/index'
import { readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const id = Number(event.context.params?.id)
  if (!id || isNaN(id))
    throw createError({ statusCode: 400, message: 'ID inválido' })

  const body = await readBody(event)
  const mes = body?.mes as string | undefined

  const transacao = db.prepare(`SELECT id, tipo, fixa FROM transacoes WHERE id = ?`).get([id]) as any
  if (!transacao)
    throw createError({ statusCode: 404, message: 'Transação não encontrada' })
  if (transacao.tipo !== 'despesa')
    throw createError({ statusCode: 400, message: 'Apenas despesas podem ser desmarcadas' })

  if (transacao.fixa) {
    if (!mes || !/^\d{4}-\d{2}$/.test(mes))
      throw createError({ statusCode: 400, message: 'Parâmetro "mes" é obrigatório para despesas fixas (YYYY-MM)' })

    db.prepare(`
      INSERT INTO pagamentos_fixas (transacao_id, mes, data_pagamento, nao_pago)
      VALUES (?, ?, NULL, 1)
      ON CONFLICT(transacao_id, mes) DO UPDATE SET data_pagamento = NULL, nao_pago = 1
    `).run([id, mes])

    return { transacao_id: id, mes, nao_pago: true }
  } else {
    db.prepare(`UPDATE transacoes SET pago = 0, despago = 1, data_pagamento = NULL WHERE id = ?`).run([id])
    return db.prepare(`SELECT * FROM transacoes WHERE id = ?`).get([id])
  }
})
