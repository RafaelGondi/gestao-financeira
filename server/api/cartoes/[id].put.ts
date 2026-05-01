import db from '../../db/index'
import { readBody, getRouterParam } from 'h3'

interface CartaoBody {
  nome: string
  banco: string
  banco_key: string
  limite: number
  melhor_data_compra: number
  vencimento: number
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })
  }

  const existing = db.prepare('SELECT id FROM cartoes WHERE id = ?').get([id])
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Cartão não encontrado' })
  }

  const body = await readBody<CartaoBody>(event)

  if (!body.nome || typeof body.nome !== 'string' || body.nome.trim() === '') {
    throw createError({ statusCode: 400, statusMessage: 'Nome é obrigatório' })
  }
  if (!body.banco || typeof body.banco !== 'string' || body.banco.trim() === '') {
    throw createError({ statusCode: 400, statusMessage: 'Banco é obrigatório' })
  }
  if (typeof body.limite !== 'number' || body.limite < 0) {
    throw createError({ statusCode: 400, statusMessage: 'Limite inválido' })
  }
  if (
    !Number.isInteger(body.melhor_data_compra) ||
    body.melhor_data_compra < 1 ||
    body.melhor_data_compra > 31
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Melhor data para compra inválida (1-31)' })
  }
  if (
    !Number.isInteger(body.vencimento) ||
    body.vencimento < 1 ||
    body.vencimento > 31
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Vencimento inválido (1-31)' })
  }

  db.prepare(
    `UPDATE cartoes
     SET nome = ?, banco = ?, banco_key = ?, limite = ?, melhor_data_compra = ?, vencimento = ?
     WHERE id = ?`
  ).run([body.nome.trim(), body.banco.trim(), body.banco_key?.trim() ?? '', body.limite, body.melhor_data_compra, body.vencimento, id])

  const cartao = db.prepare('SELECT * FROM cartoes WHERE id = ?').get([id])
  return cartao
})
