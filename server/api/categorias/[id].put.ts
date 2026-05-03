import db from '../../db/index'
import { readBody, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID inválido' })
  if (!db.prepare(`SELECT id FROM categorias WHERE id = ?`).get([id]))
    throw createError({ statusCode: 404, statusMessage: 'Categoria não encontrada' })

  const body = await readBody<{ nome: string; tipo: string; cor: string; icone: string; supercategoria_id?: number | null }>(event)
  if (!body.nome?.trim()) throw createError({ statusCode: 400, statusMessage: 'Nome é obrigatório' })

  db.prepare(`UPDATE categorias SET nome = ?, tipo = ?, cor = ?, icone = ?, supercategoria_id = ? WHERE id = ?`)
    .run([body.nome.trim(), body.tipo, body.cor, body.icone, body.supercategoria_id ?? null, id])

  return db.prepare(`SELECT id, nome, tipo, cor, icone, supercategoria_id FROM categorias WHERE id = ?`).get([id])
})
