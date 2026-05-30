import db from '../../db/index'
import { readBody } from 'h3'
import { getSaldoConta } from '../../utils/getSaldoConta'
import { faturaDateRange } from '../../utils/fatura'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { cartao_id, mes, conta_id, data_pagamento, valor_ajuste } = body

  if (!cartao_id || !mes || !/^\d{4}-\d{2}$/.test(mes))
    throw createError({ statusCode: 400, message: 'Dados inválidos' })
  if (!conta_id)
    throw createError({ statusCode: 400, message: 'Conta é obrigatória' })
  if (!data_pagamento)
    throw createError({ statusCode: 400, message: 'Data de pagamento é obrigatória' })

  // Resolve ajuste: use the value sent from the form if provided,
  // otherwise fall back to any existing valor_ajuste already stored in the DB.
  const existing = db.prepare(`SELECT COALESCE(valor_ajuste, 0) AS ajuste FROM faturas WHERE cartao_id = ? AND mes = ?`)
    .get([Number(cartao_id), mes]) as { ajuste: number } | undefined
  const ajuste = (valor_ajuste !== undefined && valor_ajuste !== null && valor_ajuste !== '')
    ? Number(valor_ajuste)
    : (existing?.ajuste ?? 0)

  const cartao = db.prepare(`SELECT melhor_data_compra FROM cartoes WHERE id = ?`).get([Number(cartao_id)]) as any
  if (!cartao) throw createError({ statusCode: 404, message: 'Cartão não encontrado' })

  const [fy, fm] = mes.split('-').map(Number)
  // Usa janela explícita da fatura (ex: fatura de transição), caindo back pro cálculo padrão
  const faturaExistente = db.prepare(`SELECT janela_inicio, janela_fim FROM faturas WHERE cartao_id = ? AND mes = ?`)
    .get([Number(cartao_id), mes]) as { janela_inicio: string | null; janela_fim: string | null } | undefined
  const { startDate: fStart, endDate: fEnd } = faturaExistente?.janela_inicio
    ? { startDate: faturaExistente.janela_inicio, endDate: faturaExistente.janela_fim! }
    : faturaDateRange(fy, fm, cartao.melhor_data_compra)

  const totalTransacoes = (db.prepare(`
    SELECT COALESCE(SUM(valor), 0) AS t FROM transacoes
    WHERE tipo = 'despesa' AND cartao_id = ?
      AND ((fixa = 0 AND data >= ? AND data <= ?)
        OR (fixa = 1 AND data_inicio <= ? AND (data_fim IS NULL OR data_fim >= ?)))
  `).get([Number(cartao_id), fStart, fEnd, fEnd, fStart]) as any).t

  const totalExtornos = (db.prepare(`
    SELECT COALESCE(SUM(valor), 0) AS t FROM extornos WHERE cartao_id = ? AND mes = ?
  `).get([Number(cartao_id), mes]) as any).t

  const valorFatura = Math.round((totalTransacoes + ajuste - totalExtornos) * 100) / 100

  // Saldo validation (compare in integer cents to avoid floating-point issues)
  const saldo = getSaldoConta(Number(conta_id))
  if (valorFatura > 0 && Math.round(valorFatura * 100) > Math.round(saldo * 100)) {
    throw createError({
      statusCode: 422,
      message: `Saldo insuficiente. Disponível: R$ ${saldo.toFixed(2).replace('.', ',')}`,
    })
  }

  db.prepare(`
    INSERT INTO faturas (cartao_id, mes, pago, conta_id, data_pagamento, valor_ajuste)
    VALUES (?, ?, 1, ?, ?, ?)
    ON CONFLICT(cartao_id, mes) DO UPDATE SET pago = 1, conta_id = ?, data_pagamento = ?, valor_ajuste = ?
  `).run([cartao_id, mes, conta_id, data_pagamento, ajuste, conta_id, data_pagamento, ajuste])

  return db.prepare(`SELECT * FROM faturas WHERE cartao_id = ? AND mes = ?`).get([cartao_id, mes])
})
