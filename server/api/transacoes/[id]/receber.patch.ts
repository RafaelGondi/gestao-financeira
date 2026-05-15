import db from '../../../db/index'
import { readBody } from 'h3'
import { localDateStr } from '../../../utils/localDate'

export default defineEventHandler(async (event) => {
  const id = Number(event.context.params?.id)
  if (!id || isNaN(id))
    throw createError({ statusCode: 400, message: 'ID inválido' })

  const body = await readBody(event)
  const today = localDateStr()
  const dataRecebimento = body?.data_recebimento ?? today
  const mes = body?.mes as string | undefined

  const transacao = db.prepare(`SELECT id, tipo, fixa FROM transacoes WHERE id = ?`).get([id]) as any
  if (!transacao)
    throw createError({ statusCode: 404, message: 'Transação não encontrada' })
  if (transacao.tipo !== 'receita')
    throw createError({ statusCode: 400, message: 'Apenas receitas podem ser marcadas como recebidas' })

  if (transacao.fixa) {
    if (!mes || !/^\d{4}-\d{2}$/.test(mes))
      throw createError({ statusCode: 400, message: 'Parâmetro "mes" é obrigatório para receitas fixas (YYYY-MM)' })

    db.prepare(`
      INSERT INTO pagamentos_fixas (transacao_id, mes, data_pagamento)
      VALUES (?, ?, ?)
      ON CONFLICT(transacao_id, mes) DO UPDATE SET data_pagamento = ?
    `).run([id, mes, dataRecebimento, dataRecebimento])

    return { transacao_id: id, mes, data_recebimento: dataRecebimento }
  } else {
    db.prepare(`UPDATE transacoes SET pago = 1, data_pagamento = ? WHERE id = ?`).run([dataRecebimento, id])
    return db.prepare(`SELECT * FROM transacoes WHERE id = ?`).get([id])
  }
})
