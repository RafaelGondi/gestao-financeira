import db from '../../db/index'
import { readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!Array.isArray(body.ids) || body.ids.some((id: any) => typeof id !== 'number'))
    throw createError({ statusCode: 400, statusMessage: 'ids deve ser um array de números' })

  const update = db.prepare(`UPDATE contas SET ordem = ? WHERE id = ?`)
  const run = db.transaction((ids: number[]) => {
    ids.forEach((id, i) => update.run([i, id]))
  })
  run(body.ids)

  return { ok: true }
})
