import db from '../../db/index'
import { readBody, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID inválido' })
  if (!db.prepare(`SELECT id FROM supercategorias WHERE id = ?`).get([id]))
    throw createError({ statusCode: 404, statusMessage: 'Supercategoria não encontrada' })

  const body = await readBody<{ nome: string; cor: string; icone: string }>(event)
  if (!body.nome?.trim()) throw createError({ statusCode: 400, statusMessage: 'Nome é obrigatório' })

  db.prepare(`UPDATE supercategorias SET nome = ?, cor = ?, icone = ? WHERE id = ?`)
    .run([body.nome.trim(), body.cor, body.icone, id])

  return db.prepare(`SELECT id, nome, cor, icone FROM supercategorias WHERE id = ?`).get([id])
})
