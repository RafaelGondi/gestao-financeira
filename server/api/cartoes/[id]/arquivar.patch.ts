import db from '../../../db/index'
import { getRouterParam } from 'h3'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'ID inválido' })

  const cartao = db.prepare(`SELECT id FROM cartoes WHERE id = ?`).get([id])
  if (!cartao) throw createError({ statusCode: 404, statusMessage: 'Cartão não encontrado' })

  const now = new Date()
  const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  db.prepare(`UPDATE cartoes SET arquivado = 1, arquivado_em = ? WHERE id = ?`).run([mes, id])
  return { success: true }
})
