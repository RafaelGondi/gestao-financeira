import db from '../../db/index'
import { readBody } from 'h3'

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

    const result = db.prepare(`
      INSERT INTO transacoes (descricao, valor, tipo, categoria, conta_id, data, pago, fixa, data_inicio, data_fim)
      VALUES (?, ?, 'receita', ?, ?, ?, 0, 1, ?, ?)
    `).run([body.descricao.trim(), body.valor, body.categoria?.trim() || null, contaId, body.data_inicio, body.data_inicio, body.data_fim || null])

    return db.prepare(`
      SELECT t.id, t.descricao, t.valor, t.categoria, t.fixa, t.data_inicio, t.data_fim, t.data, t.conta_id,
        c.nome AS conta_nome, c.banco_key,
        CASE WHEN t.data_fim IS NOT NULL AND t.data_fim < date('now') THEN 2 ELSE 1 END AS recebido
      FROM transacoes t LEFT JOIN contas c ON c.id = t.conta_id WHERE t.id = ?
    `).get([result.lastInsertRowid])
  } else {
    if (!body.data || !dateRe.test(body.data))
      throw createError({ statusCode: 400, statusMessage: 'Data inválida' })

    const result = db.prepare(`
      INSERT INTO transacoes (descricao, valor, tipo, categoria, conta_id, data, pago, fixa)
      VALUES (?, ?, 'receita', ?, ?, ?, CASE WHEN ? <= date('now') THEN 1 ELSE 0 END, 0)
    `).run([body.descricao.trim(), body.valor, body.categoria?.trim() || null, contaId, body.data, body.data])

    return db.prepare(`
      SELECT t.id, t.descricao, t.valor, t.categoria, t.fixa, t.data_inicio, t.data_fim, t.data, t.conta_id,
        c.nome AS conta_nome, c.banco_key,
        CASE WHEN t.data <= date('now') THEN 1 ELSE 0 END AS recebido
      FROM transacoes t LEFT JOIN contas c ON c.id = t.conta_id WHERE t.id = ?
    `).get([result.lastInsertRowid])
  }
})
