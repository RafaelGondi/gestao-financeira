import db from '../../db/index'
import { readBody, getRouterParam } from 'h3'

interface ReceitaBody {
  descricao: string
  valor: number
  categoria?: string
  conta_id?: number | null
  fixa: boolean
  data?: string
  data_inicio?: string
  data_fim?: string
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id))
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })

  const existing = db.prepare(`SELECT id FROM transacoes WHERE id = ? AND tipo = 'receita'`).get([id])
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Receita não encontrada' })

  const body = await readBody<ReceitaBody>(event)

  if (!body.descricao?.trim())
    throw createError({ statusCode: 400, statusMessage: 'Descrição é obrigatória' })
  if (typeof body.valor !== 'number' || body.valor <= 0)
    throw createError({ statusCode: 400, statusMessage: 'Valor inválido' })
  if (!body.conta_id)
    throw createError({ statusCode: 400, statusMessage: 'Conta é obrigatória' })

  const dateRe = /^\d{4}-\d{2}-\d{2}$/
  const contaId = Number(body.conta_id)

  if (body.fixa) {
    if (!body.data_inicio || !dateRe.test(body.data_inicio))
      throw createError({ statusCode: 400, statusMessage: 'Data de início inválida' })
    if (body.data_fim && !dateRe.test(body.data_fim))
      throw createError({ statusCode: 400, statusMessage: 'Data de fim inválida' })

    db.prepare(`
      UPDATE transacoes
      SET descricao = ?, valor = ?, categoria = ?, conta_id = ?, fixa = 1,
          data = ?, data_inicio = ?, data_fim = ?, pago = 0
      WHERE id = ?
    `).run([body.descricao.trim(), body.valor, body.categoria?.trim() || null, contaId,
            body.data_inicio, body.data_inicio, body.data_fim || null, id])
  } else {
    if (!body.data || !dateRe.test(body.data))
      throw createError({ statusCode: 400, statusMessage: 'Data inválida' })

    db.prepare(`
      UPDATE transacoes
      SET descricao = ?, valor = ?, categoria = ?, conta_id = ?, fixa = 0,
          data = ?, data_inicio = NULL, data_fim = NULL,
          pago = CASE WHEN ? <= date('now') THEN 1 ELSE 0 END
      WHERE id = ?
    `).run([body.descricao.trim(), body.valor, body.categoria?.trim() || null, contaId,
            body.data, body.data, id])
  }

  return db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, t.fixa, t.data_inicio, t.data_fim, t.data, t.conta_id,
      c.nome AS conta_nome, c.banco_key,
      CASE
        WHEN t.fixa = 1 THEN
          CASE WHEN t.data_fim IS NOT NULL AND t.data_fim < date('now') THEN 2 ELSE 1 END
        WHEN t.data <= date('now') THEN 1 ELSE 0
      END AS recebido
    FROM transacoes t LEFT JOIN contas c ON c.id = t.conta_id WHERE t.id = ?
  `).get([id])
})
