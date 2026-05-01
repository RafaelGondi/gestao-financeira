import db from '../../db/index'
import { getQuery } from 'h3'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const month = query.month as string | undefined

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return db.prepare(`
      SELECT tr.id, tr.descricao, tr.valor, tr.data,
        tr.conta_origem_id, tr.conta_destino_id,
        co.nome AS conta_origem_nome,
        cd.nome AS conta_destino_nome
      FROM transferencias tr
      JOIN contas co ON co.id = tr.conta_origem_id
      JOIN contas cd ON cd.id = tr.conta_destino_id
      ORDER BY tr.data DESC
    `).all()
  }

  const [year, mon] = month.split('-')
  const startDate = `${year}-${mon}-01`
  const lastDay = new Date(Number(year), Number(mon), 0).getDate()
  const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`

  return db.prepare(`
    SELECT tr.id, tr.descricao, tr.valor, tr.data,
      tr.conta_origem_id, tr.conta_destino_id,
      co.nome AS conta_origem_nome,
      cd.nome AS conta_destino_nome
    FROM transferencias tr
    JOIN contas co ON co.id = tr.conta_origem_id
    JOIN contas cd ON cd.id = tr.conta_destino_id
    WHERE tr.data >= ? AND tr.data <= ?
    ORDER BY tr.data DESC
  `).all([startDate, endDate])
})
