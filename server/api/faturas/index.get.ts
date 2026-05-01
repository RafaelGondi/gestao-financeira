import db from '../../db/index'
import { getQuery } from 'h3'

export default defineEventHandler((event) => {
  const { mes } = getQuery(event)
  if (!mes || !/^\d{4}-\d{2}$/.test(mes as string)) return []

  return db.prepare(`
    SELECT f.id, f.cartao_id, f.mes, f.pago, f.conta_id, f.data_pagamento, f.valor_ajuste,
      c.nome AS conta_nome
    FROM faturas f
    LEFT JOIN contas c ON c.id = f.conta_id
    WHERE f.mes = ?
  `).all([mes])
})
