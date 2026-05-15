import db from '../../db/index'
import { readBody, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const { nome, valor_alvo, prazo, icone, cor, concluida } = await readBody(event)
  db.prepare(`
    UPDATE metas SET nome = ?, valor_alvo = ?, prazo = ?, icone = ?, cor = ?, concluida = ?
    WHERE id = ?
  `).run([nome, valor_alvo, prazo, icone, cor, concluida ? 1 : 0, id])
  return db.prepare(`SELECT * FROM metas WHERE id = ?`).get(id)
})
