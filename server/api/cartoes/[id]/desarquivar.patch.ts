import db from '../../../db/index'
import { getRouterParam } from 'h3'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'ID inválido' })

  const cartao = db.prepare(`SELECT id FROM cartoes WHERE id = ?`).get([id])
  if (!cartao) throw createError({ statusCode: 404, statusMessage: 'Cartão não encontrado' })

  db.prepare(`UPDATE cartoes SET arquivado = 0, arquivado_em = NULL WHERE id = ?`).run([id])
  return { success: true }
})
