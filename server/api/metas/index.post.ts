import db from '../../db/index'
import { readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const { nome, valor_alvo, prazo, icone, cor } = await readBody(event)
  const result = db.prepare(`
    INSERT INTO metas (nome, valor_alvo, prazo, icone, cor)
    VALUES (?, ?, ?, ?, ?)
  `).run([nome, valor_alvo, prazo, icone ?? 'i-lucide-flag', cor ?? '#6366f1'])
  return db.prepare(`SELECT * FROM metas WHERE id = ?`).get(result.lastInsertRowid)
})
