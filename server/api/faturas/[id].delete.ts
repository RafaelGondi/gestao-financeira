import db from '../../db/index'
import { getRouterParam } from 'h3'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  db.prepare(`UPDATE faturas SET pago = 0, conta_id = NULL, data_pagamento = NULL WHERE id = ?`).run([id])
  return { ok: true }
})
