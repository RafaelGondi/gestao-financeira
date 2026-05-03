import db from '../../db/index'
import { readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ nome: string; tipo: string; cor: string; icone: string; supercategoria_id?: number | null }>(event)
  if (!body.nome?.trim()) throw createError({ statusCode: 400, statusMessage: 'Nome é obrigatório' })

  const result = db.prepare(
    `INSERT INTO categorias (nome, tipo, cor, icone, supercategoria_id) VALUES (?, ?, ?, ?, ?)`
  ).run([body.nome.trim(), body.tipo ?? 'despesa', body.cor ?? '#6366f1', body.icone ?? 'i-heroicons-tag', body.supercategoria_id ?? null])

  return db.prepare(`SELECT id, nome, tipo, cor, icone, supercategoria_id FROM categorias WHERE id = ?`).get([result.lastInsertRowid])
})
