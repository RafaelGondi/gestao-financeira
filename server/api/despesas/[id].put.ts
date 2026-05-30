import db from '../../db/index'
import { readBody, getRouterParam, getQuery } from 'h3'
import { localDateStr } from '../../utils/localDate'

interface DespesaBody {
  descricao: string
  valor: number
  categoria?: string
  conta_id?: number | null
  cartao_id?: number | null
  tipo: 'avulsa' | 'fixa' | 'parcelada'
  data?: string
  data_inicio?: string
  data_fim?: string
  parcelas?: number
  notas?: string
  nome_fatura?: string
}

function calcDataFim(dataInicio: string, parcelas: number): string {
  const [y, m, d] = dataInicio.split('-').map(Number)
  const total = m - 1 + parcelas - 1
  const ny = y + Math.floor(total / 12)
  const nm = (total % 12) + 1
  const lastDay = new Date(ny, nm, 0).getDate()
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`
}

function addMonths(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const total = (m - 1) + n
  const ny = y + Math.floor(total / 12)
  const nm = (total % 12) + 1
  const lastDay = new Date(ny, nm, 0).getDate()
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id))
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })

  const existing = db.prepare(`SELECT * FROM transacoes WHERE id = ? AND tipo = 'despesa'`).get([id]) as any
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Despesa não encontrada' })

  const body = await readBody<DespesaBody>(event)
  const { scope, month } = getQuery(event)

  if (!body.descricao?.trim())
    throw createError({ statusCode: 400, statusMessage: 'Descrição é obrigatória' })
  if (typeof body.valor !== 'number' || body.valor <= 0)
    throw createError({ statusCode: 400, statusMessage: 'Valor inválido' })
  if (!body.conta_id && !body.cartao_id)
    throw createError({ statusCode: 400, statusMessage: 'Conta ou cartão é obrigatório' })

  const dateRe = /^\d{4}-\d{2}-\d{2}$/
  const contaId = body.conta_id ? Number(body.conta_id) : null
  const cartaoId = body.cartao_id ? Number(body.cartao_id) : null

  // scope=one: editar apenas a ocorrência do mês atual, mantendo a fixa para os demais
  if (scope === 'one' && month && existing.fixa) {
    const row = existing
    const [iy, im] = row.data_inicio.split('-').map(Number)
    const [oy, om] = (month as string).split('-').map(Number)
    const occurrenceIndex = (oy - iy) * 12 + (om - im)

    const prevMonthDate = occurrenceIndex > 0 ? addMonths(row.data_inicio, occurrenceIndex - 1) : null
    const nextMonthDate = addMonths(row.data_inicio, occurrenceIndex + 1)

    const firstMonthYM = row.data_inicio.slice(0, 7)
    const lastMonthYM = row.data_fim ? row.data_fim.slice(0, 7) : null
    const isFirst = (month as string) === firstMonthYM
    const isLast = lastMonthYM !== null && (month as string) === lastMonthYM
    const isOnly = isFirst && isLast

    // Determina a data da ocorrência deste mês
    const day = row.data_inicio.slice(8, 10)
    const [my, mm] = (month as string).split('-').map(Number)
    const lastDayOfMonth = new Date(my, mm, 0).getDate()
    const occDay = String(Math.min(parseInt(day, 10), lastDayOfMonth)).padStart(2, '0')
    const occDate = `${month}-${occDay}`

    if (isOnly) {
      // Única ocorrência: converte a própria transação em avulsa com novos valores
      db.prepare(`
        UPDATE transacoes
        SET descricao = ?, valor = ?, categoria = ?, conta_id = ?, cartao_id = ?, fixa = 0,
            data = ?, data_inicio = NULL, data_fim = NULL, parcelas = 0, notas = ?, nome_fatura = ?
        WHERE id = ?
      `).run([body.descricao.trim(), body.valor, body.categoria?.trim() || null, contaId, cartaoId,
              occDate, body.notas?.trim() || null, body.nome_fatura?.trim() || null, id])
    } else if (isFirst) {
      // Primeira ocorrência: avança o início da fixa e cria avulsa para este mês
      const newParcelas = row.parcelas > 0 ? row.parcelas - 1 : 0
      db.prepare(`UPDATE transacoes SET data_inicio = ?, data = ?, parcelas = ? WHERE id = ?`)
        .run([nextMonthDate, nextMonthDate, newParcelas, id])
      db.prepare(`
        INSERT INTO transacoes (descricao, valor, tipo, categoria, fixa, data, data_inicio, data_fim, parcelas, conta_id, cartao_id, notas, nome_fatura)
        VALUES (?, ?, 'despesa', ?, 0, ?, NULL, NULL, 0, ?, ?, ?, ?)
      `).run([body.descricao.trim(), body.valor, body.categoria?.trim() || null, occDate, contaId, cartaoId, body.notas?.trim() || null, body.nome_fatura?.trim() || null])
    } else if (isLast) {
      // Última ocorrência: recua o fim da fixa e cria avulsa para este mês
      const newParcelas = row.parcelas > 0 ? row.parcelas - 1 : 0
      db.prepare(`UPDATE transacoes SET data_fim = ?, parcelas = ? WHERE id = ?`)
        .run([prevMonthDate, newParcelas, id])
      db.prepare(`
        INSERT INTO transacoes (descricao, valor, tipo, categoria, fixa, data, data_inicio, data_fim, parcelas, conta_id, cartao_id, notas, nome_fatura)
        VALUES (?, ?, 'despesa', ?, 0, ?, NULL, NULL, 0, ?, ?, ?, ?)
      `).run([body.descricao.trim(), body.valor, body.categoria?.trim() || null, occDate, contaId, cartaoId, body.notas?.trim() || null, body.nome_fatura?.trim() || null])
    } else {
      // Ocorrência do meio: divide a fixa em duas e cria avulsa para este mês
      const parcelas1 = row.parcelas > 0 ? occurrenceIndex : 0
      const parcelas2 = row.parcelas > 0 ? row.parcelas - occurrenceIndex - 1 : 0
      db.prepare(`UPDATE transacoes SET data_fim = ?, parcelas = ? WHERE id = ?`)
        .run([prevMonthDate, parcelas1, id])
      // Segunda parte da fixa (após este mês)
      db.prepare(`
        INSERT INTO transacoes (descricao, valor, tipo, categoria, fixa, data, data_inicio, data_fim, parcelas, conta_id, cartao_id, notas, nome_fatura)
        SELECT descricao, valor, tipo, categoria, fixa, ?, ?, ?, ?, conta_id, cartao_id, notas, nome_fatura FROM transacoes WHERE id = ?
      `).run([nextMonthDate, nextMonthDate, row.data_fim ?? null, parcelas2, id])
      // Avulsa deste mês com novos valores
      db.prepare(`
        INSERT INTO transacoes (descricao, valor, tipo, categoria, fixa, data, data_inicio, data_fim, parcelas, conta_id, cartao_id, notas, nome_fatura)
        VALUES (?, ?, 'despesa', ?, 0, ?, NULL, NULL, 0, ?, ?, ?, ?)
      `).run([body.descricao.trim(), body.valor, body.categoria?.trim() || null, occDate, contaId, cartaoId, body.notas?.trim() || null, body.nome_fatura?.trim() || null])
    }

    return { success: true }
  }

  // scope=all (ou avulsa): atualiza normalmente
  if (body.tipo === 'parcelada') {
    if (!body.data_inicio || !dateRe.test(body.data_inicio))
      throw createError({ statusCode: 400, statusMessage: 'Data de início inválida' })
    const parcelas = Number(body.parcelas)
    if (!parcelas || parcelas < 2)
      throw createError({ statusCode: 400, statusMessage: 'Número de parcelas inválido' })

    const dataFim = calcDataFim(body.data_inicio, parcelas)
    db.prepare(`
      UPDATE transacoes
      SET descricao = ?, valor = ?, categoria = ?, conta_id = ?, cartao_id = ?, fixa = 1,
          data = ?, data_inicio = ?, data_fim = ?, parcelas = ?, pago = 0, notas = ?, nome_fatura = ?
      WHERE id = ?
    `).run([body.descricao.trim(), body.valor, body.categoria?.trim() || null, contaId, cartaoId,
            body.data_inicio, body.data_inicio, dataFim, parcelas, body.notas?.trim() || null, body.nome_fatura?.trim() || null, id])
  } else if (body.tipo === 'fixa') {
    if (!body.data_inicio || !dateRe.test(body.data_inicio))
      throw createError({ statusCode: 400, statusMessage: 'Data de início inválida' })
    if (body.data_fim && !dateRe.test(body.data_fim))
      throw createError({ statusCode: 400, statusMessage: 'Data de fim inválida' })

    db.prepare(`
      UPDATE transacoes
      SET descricao = ?, valor = ?, categoria = ?, conta_id = ?, cartao_id = ?, fixa = 1,
          data = ?, data_inicio = ?, data_fim = ?, parcelas = 0, pago = 0, notas = ?, nome_fatura = ?
      WHERE id = ?
    `).run([body.descricao.trim(), body.valor, body.categoria?.trim() || null, contaId, cartaoId,
            body.data_inicio, body.data_inicio, body.data_fim || null, body.notas?.trim() || null, body.nome_fatura?.trim() || null, id])
  } else {
    if (!body.data || !dateRe.test(body.data))
      throw createError({ statusCode: 400, statusMessage: 'Data inválida' })

    db.prepare(`
      UPDATE transacoes
      SET descricao = ?, valor = ?, categoria = ?, conta_id = ?, cartao_id = ?, fixa = 0,
          data = ?, data_inicio = NULL, data_fim = NULL, parcelas = 0,
          pago = CASE WHEN ? <= ? THEN 1 ELSE 0 END, notas = ?, nome_fatura = ?
      WHERE id = ?
    `).run([body.descricao.trim(), body.valor, body.categoria?.trim() || null, contaId, cartaoId,
            body.data, body.data, localDateStr(), body.notas?.trim() || null, body.nome_fatura?.trim() || null, id])
  }

  const today = localDateStr()
  return db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, t.fixa, t.parcelas, t.data_inicio, t.data_fim, t.data,
      t.conta_id, t.cartao_id, t.notas, t.nome_fatura, c.nome AS conta_nome, c.banco_key,
      CASE
        WHEN t.fixa = 1 THEN
          CASE WHEN t.data_fim IS NOT NULL AND t.data_fim < ? THEN 2 ELSE 1 END
        WHEN t.data <= ? THEN 1 ELSE 0
      END AS pago
    FROM transacoes t LEFT JOIN contas c ON c.id = t.conta_id WHERE t.id = ?
  `).get([today, today, id])
})
