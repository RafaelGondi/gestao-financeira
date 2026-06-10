import db from '../../../db/index'
import { readBody, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const patrimonio_id = Number(getRouterParam(event, 'id'))
  const { tipo, valor, data, notas } = await readBody(event)

  const item = db.prepare(`SELECT saldo_atual FROM patrimonio_externo WHERE id = ?`).get(patrimonio_id) as { saldo_atual: number } | undefined
  if (!item) throw createError({ statusCode: 404, message: 'Patrimônio não encontrado' })

  const v = Number(valor)
  if (!Number.isFinite(v) || v <= 0) throw createError({ statusCode: 400, message: 'Valor inválido' })

  const movTipo = tipo === 'retirada' ? 'retirada' : tipo === 'ajuste' ? 'ajuste' : 'aporte'

  let novoSaldo = item.saldo_atual
  if (movTipo === 'retirada') {
    if (Math.round(v * 100) > Math.round(item.saldo_atual * 100)) {
      throw createError({
        statusCode: 422,
        message: `Saldo insuficiente. Disponível: R$ ${item.saldo_atual.toFixed(2).replace('.', ',')}`,
      })
    }
    novoSaldo -= v
  } else if (movTipo === 'ajuste') novoSaldo = v
  else novoSaldo += v

  const result = db.prepare(`
    INSERT INTO patrimonio_movimentos (patrimonio_id, tipo, valor, data, notas)
    VALUES (?, ?, ?, ?, ?)
  `).run([patrimonio_id, movTipo, v, data, notas?.trim() || null])

  db.prepare(`UPDATE patrimonio_externo SET saldo_atual = ? WHERE id = ?`).run([novoSaldo, patrimonio_id])

  return db.prepare(`SELECT * FROM patrimonio_movimentos WHERE id = ?`).get(result.lastInsertRowid)
})
