import db from '../../db/index'
import { readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ nome: string; cor: string; icone: string }>(event)
  if (!body.nome?.trim()) throw createError({ statusCode: 400, statusMessage: 'Nome é obrigatório' })

  const result = db.prepare(
    `INSERT INTO supercategorias (nome, cor, icone) VALUES (?, ?, ?)`
  ).run([body.nome.trim(), body.cor ?? '#6366f1', body.icone ?? 'i-heroicons-tag'])

  return db.prepare(`SELECT id, nome, cor, icone FROM supercategorias WHERE id = ?`).get([result.lastInsertRowid])
})
