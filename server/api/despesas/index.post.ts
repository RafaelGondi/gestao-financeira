import db from '../../db/index'
import { readBody } from 'h3'

interface DespesaBody {
  descricao: string
  valor: number
  categoria?: string
  conta_id?: number | null
  tipo: 'avulsa' | 'fixa' | 'parcelada'
  data?: string
  data_inicio?: string
  data_fim?: string
  parcelas?: number
}

function calcDataFim(dataInicio: string, parcelas: number): string {
  const [y, m, d] = dataInicio.split('-').map(Number)
  const total = m - 1 + parcelas - 1
  const ny = y + Math.floor(total / 12)
  const nm = (total % 12) + 1
  const lastDay = new Date(ny, nm, 0).getDate()
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`
}

export default defineEventHandler(async (event) => {
  const body = await readBody<DespesaBody>(event)

  if (!body.descricao?.trim())
    throw createError({ statusCode: 400, statusMessage: 'Descrição é obrigatória' })
  if (typeof body.valor !== 'number' || body.valor <= 0)
    throw createError({ statusCode: 400, statusMessage: 'Valor inválido' })
  if (!body.conta_id)
    throw createError({ statusCode: 400, statusMessage: 'Conta é obrigatória' })

  const dateRe = /^\d{4}-\d{2}-\d{2}$/
  const contaId = Number(body.conta_id)

  if (body.tipo === 'parcelada') {
    if (!body.data_inicio || !dateRe.test(body.data_inicio))
      throw createError({ statusCode: 400, statusMessage: 'Data de início inválida' })
    const parcelas = Number(body.parcelas)
    if (!parcelas || parcelas < 2)
      throw createError({ statusCode: 400, statusMessage: 'Número de parcelas inválido (mínimo 2)' })

    const dataFim = calcDataFim(body.data_inicio, parcelas)
    const result = db.prepare(`
      INSERT INTO transacoes (descricao, valor, tipo, categoria, conta_id, data, pago, fixa, data_inicio, data_fim, parcelas)
      VALUES (?, ?, 'despesa', ?, ?, ?, 0, 1, ?, ?, ?)
    `).run([body.descricao.trim(), body.valor, body.categoria?.trim() || null, contaId, body.data_inicio, body.data_inicio, dataFim, parcelas])

    return db.prepare(`
      SELECT t.id, t.descricao, t.valor, t.categoria, t.fixa, t.parcelas, t.data_inicio, t.data_fim, t.data, t.conta_id,
        c.nome AS conta_nome, c.banco_key, 1 AS pago
      FROM transacoes t LEFT JOIN contas c ON c.id = t.conta_id WHERE t.id = ?
    `).get([result.lastInsertRowid])
  }

  if (body.tipo === 'fixa') {
    if (!body.data_inicio || !dateRe.test(body.data_inicio))
      throw createError({ statusCode: 400, statusMessage: 'Data de início inválida' })
    if (body.data_fim && !dateRe.test(body.data_fim))
      throw createError({ statusCode: 400, statusMessage: 'Data de fim inválida' })

    const result = db.prepare(`
      INSERT INTO transacoes (descricao, valor, tipo, categoria, conta_id, data, pago, fixa, data_inicio, data_fim, parcelas)
      VALUES (?, ?, 'despesa', ?, ?, ?, 0, 1, ?, ?, 0)
    `).run([body.descricao.trim(), body.valor, body.categoria?.trim() || null, contaId, body.data_inicio, body.data_inicio, body.data_fim || null])

    return db.prepare(`
      SELECT t.id, t.descricao, t.valor, t.categoria, t.fixa, t.parcelas, t.data_inicio, t.data_fim, t.data, t.conta_id,
        c.nome AS conta_nome, c.banco_key,
        CASE WHEN t.data_fim IS NOT NULL AND t.data_fim < date('now') THEN 2 ELSE 1 END AS pago
      FROM transacoes t LEFT JOIN contas c ON c.id = t.conta_id WHERE t.id = ?
    `).get([result.lastInsertRowid])
  }

  // avulsa
  if (!body.data || !dateRe.test(body.data))
    throw createError({ statusCode: 400, statusMessage: 'Data inválida' })

  const result = db.prepare(`
    INSERT INTO transacoes (descricao, valor, tipo, categoria, conta_id, data, pago, fixa, parcelas)
    VALUES (?, ?, 'despesa', ?, ?, ?, CASE WHEN ? <= date('now') THEN 1 ELSE 0 END, 0, 0)
  `).run([body.descricao.trim(), body.valor, body.categoria?.trim() || null, contaId, body.data, body.data])

  return db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, t.fixa, t.parcelas, t.data_inicio, t.data_fim, t.data, t.conta_id,
      c.nome AS conta_nome, c.banco_key,
      CASE WHEN t.data <= date('now') THEN 1 ELSE 0 END AS pago
    FROM transacoes t LEFT JOIN contas c ON c.id = t.conta_id WHERE t.id = ?
  `).get([result.lastInsertRowid])
})
