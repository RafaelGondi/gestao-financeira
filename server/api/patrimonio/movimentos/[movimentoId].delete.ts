import db from '../../../db/index'
import { getRouterParam } from 'h3'
import { deleteTransferenciaComPatrimonio, revertPatrimonioMovimento } from '../../../utils/transferenciaPatrimonio'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'movimentoId'))

  const mov = db.prepare(`
    SELECT m.*, p.saldo_atual
    FROM patrimonio_movimentos m
    JOIN patrimonio_externo p ON p.id = m.patrimonio_id
    WHERE m.id = ?
  `).get(id) as {
    id: number
    patrimonio_id: number
    tipo: string
    valor: number
    saldo_atual: number
    transferencia_id: number | null
  } | undefined

  if (!mov) throw createError({ statusCode: 404, message: 'Movimento não encontrado' })

  if (mov.transferencia_id) {
    deleteTransferenciaComPatrimonio(mov.transferencia_id)
    return { ok: true }
  }

  revertPatrimonioMovimento(mov)
  db.prepare(`DELETE FROM patrimonio_movimentos WHERE id = ?`).run(id)

  return { ok: true }
})
