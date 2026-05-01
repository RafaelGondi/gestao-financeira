import db from '../../db/index'
import { getRouterParam, getQuery } from 'h3'

function addMonths(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const total = (m - 1) + n
  const ny = y + Math.floor(total / 12)
  const nm = (total % 12) + 1
  const lastDay = new Date(ny, nm, 0).getDate()
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`
}

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  const { scope, month } = getQuery(event)

  if (!id || isNaN(id))
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })

  const row = db.prepare(`
    SELECT id, fixa, parcelas, data_inicio, data_fim, descricao, valor, categoria, conta_id
    FROM transacoes WHERE id = ? AND tipo = 'receita'
  `).get([id]) as any

  if (!row)
    throw createError({ statusCode: 404, statusMessage: 'Receita não encontrada' })

  if (!row.fixa || scope !== 'one' || !month) {
    db.prepare('DELETE FROM transacoes WHERE id = ?').run([id])
    return { success: true }
  }

  const [iy, im] = row.data_inicio.split('-').map(Number)
  const [oy, om] = (month as string).split('-').map(Number)
  const occurrenceIndex = (oy - iy) * 12 + (om - im)

  const prevMonthDate = addMonths(row.data_inicio, occurrenceIndex - 1)
  const nextMonthDate = addMonths(row.data_inicio, occurrenceIndex + 1)

  const firstMonthYM = row.data_inicio.slice(0, 7)
  const lastMonthYM = row.data_fim ? row.data_fim.slice(0, 7) : null
  const isFirst = (month as string) === firstMonthYM
  const isLast = lastMonthYM !== null && (month as string) === lastMonthYM
  const isOnly = isFirst && isLast

  if (isOnly) {
    db.prepare('DELETE FROM transacoes WHERE id = ?').run([id])
  } else if (isFirst) {
    const newParcelas = row.parcelas > 0 ? row.parcelas - 1 : 0
    db.prepare('UPDATE transacoes SET data_inicio = ?, parcelas = ? WHERE id = ?')
      .run([nextMonthDate, newParcelas, id])
  } else if (isLast) {
    const newParcelas = row.parcelas > 0 ? row.parcelas - 1 : 0
    db.prepare('UPDATE transacoes SET data_fim = ?, parcelas = ? WHERE id = ?')
      .run([prevMonthDate, newParcelas, id])
  } else {
    const parcelas1 = row.parcelas > 0 ? occurrenceIndex : 0
    const parcelas2 = row.parcelas > 0 ? row.parcelas - occurrenceIndex - 1 : 0
    db.prepare('UPDATE transacoes SET data_fim = ?, parcelas = ? WHERE id = ?')
      .run([prevMonthDate, parcelas1, id])
    db.prepare(`
      INSERT INTO transacoes (descricao, valor, tipo, categoria, fixa, data, data_inicio, data_fim, parcelas, conta_id)
      SELECT descricao, valor, tipo, categoria, fixa, data, ?, ?, ?, conta_id FROM transacoes WHERE id = ?
    `).run([nextMonthDate, row.data_fim ?? null, parcelas2, id])
  }

  return { success: true }
})
