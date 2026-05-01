import db from '../../db/index'
import { readBody } from 'h3'

interface CartaoBody {
  nome: string
  banco: string
  limite: number
  melhor_data_compra: number
  vencimento: number
}

export default defineEventHandler(async (event) => {
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

  const result = db.prepare(
    `INSERT INTO cartoes (nome, banco, limite, melhor_data_compra, vencimento)
     VALUES (?, ?, ?, ?, ?)`
  ).run([body.nome.trim(), body.banco.trim(), body.limite, body.melhor_data_compra, body.vencimento])

  const cartao = db.prepare('SELECT * FROM cartoes WHERE id = ?').get([result.lastInsertRowid])
  return cartao
})
