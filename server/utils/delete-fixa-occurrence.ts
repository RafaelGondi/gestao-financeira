import db from '../db/index'
import { calcFaturaMonth } from './fatura'

function addMonths(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const total = (m - 1) + n
  const ny = y + Math.floor(total / 12)
  const nm = (total % 12) + 1
  const lastDay = new Date(ny, nm, 0).getDate()
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`
}

type FixaRow = {
  id: number
  parcelas: number
  data_inicio: string
  data_fim: string | null
  conta_id: number | null
  cartao_id: number | null
}

/** Índice da ocorrência fixa a remover quando o usuário exclui "só este mês". */
export function resolveFixaOccurrenceIndex(row: FixaRow, month: string): number {
  if (row.cartao_id) {
    const cartao = db.prepare(`SELECT melhor_data_compra FROM cartoes WHERE id = ?`).get(row.cartao_id) as
      { melhor_data_compra: number } | undefined
    const cutoff = cartao?.melhor_data_compra ?? 1
    const [py, pm] = month.split('-').map(Number)
    const prevMesStr = `${pm === 1 ? py - 1 : py}-${String(pm === 1 ? 12 : pm - 1).padStart(2, '0')}`
    const calcMes = calcFaturaMonth(row.data_inicio, cutoff, month, prevMesStr)
    const [iy, im] = row.data_inicio.split('-').map(Number)
    const [cy, cm] = calcMes.split('-').map(Number)
    return (cy - iy) * 12 + (cm - im)
  }

  const [iy, im] = row.data_inicio.split('-').map(Number)
  const [oy, om] = month.split('-').map(Number)
  return (oy - iy) * 12 + (om - im)
}

export function deleteFixaSingleOccurrence(row: FixaRow, month: string): void {
  if (row.cartao_id) {
    const faturaPaga = db.prepare(`
      SELECT pago FROM faturas WHERE cartao_id = ? AND mes = ?
    `).get([row.cartao_id, month]) as { pago: number } | undefined
    if (faturaPaga?.pago) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Não é possível excluir lançamentos de uma fatura já paga',
      })
    }
  }

  const occurrenceIndex = resolveFixaOccurrenceIndex(row, month)
  const prevMonthDate = addMonths(row.data_inicio, occurrenceIndex - 1)
  const nextMonthDate = addMonths(row.data_inicio, occurrenceIndex + 1)

  const isOnly = row.parcelas === 1 && occurrenceIndex <= 0
  const isFirst = occurrenceIndex <= 0
  const isLast = row.parcelas > 0
    ? occurrenceIndex >= row.parcelas - 1
    : row.data_fim != null && month === row.data_fim.slice(0, 7)

  if (isOnly || (isFirst && row.parcelas <= 1 && !row.data_fim)) {
    db.prepare('DELETE FROM transacoes WHERE id = ?').run([row.id])
    return
  }

  if (isFirst) {
    const newParcelas = row.parcelas > 0 ? row.parcelas - 1 : 0
    db.prepare(`UPDATE transacoes SET data_inicio = ?, parcelas = ? WHERE id = ?`)
      .run([nextMonthDate, newParcelas, row.id])
    return
  }

  if (isLast) {
    const newParcelas = row.parcelas > 0 ? row.parcelas - 1 : 0
    db.prepare(`UPDATE transacoes SET data_fim = ?, parcelas = ? WHERE id = ?`)
      .run([prevMonthDate, newParcelas, row.id])
    return
  }

  const parcelas1 = row.parcelas > 0 ? occurrenceIndex : 0
  const parcelas2 = row.parcelas > 0 ? row.parcelas - occurrenceIndex - 1 : 0
  db.prepare(`UPDATE transacoes SET data_fim = ?, parcelas = ? WHERE id = ?`)
    .run([prevMonthDate, parcelas1, row.id])
  db.prepare(`
    INSERT INTO transacoes (descricao, valor, tipo, categoria, fixa, data, data_inicio, data_fim, parcelas, conta_id, cartao_id, notas, nome_fatura)
    SELECT descricao, valor, tipo, categoria, fixa, data, ?, ?, ?, conta_id, cartao_id, notas, nome_fatura
    FROM transacoes WHERE id = ?
  `).run([nextMonthDate, row.data_fim ?? null, parcelas2, row.id])
}
