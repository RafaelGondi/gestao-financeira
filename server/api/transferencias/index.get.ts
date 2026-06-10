import db from '../../db/index'
import { getQuery } from 'h3'

const SELECT = `
  SELECT tr.id, tr.descricao, tr.valor, tr.data,
    tr.conta_origem_id, tr.conta_destino_id,
    tr.patrimonio_destino_id, tr.patrimonio_origem_id,
    co.nome AS conta_origem_nome,
    cd.nome AS conta_destino_nome,
    pe.nome AS patrimonio_destino_nome,
    pe.tipo AS patrimonio_destino_tipo,
    po.nome AS patrimonio_origem_nome,
    po.tipo AS patrimonio_origem_tipo
  FROM transferencias tr
  LEFT JOIN contas co ON co.id = tr.conta_origem_id
  LEFT JOIN contas cd ON cd.id = tr.conta_destino_id
  LEFT JOIN patrimonio_externo pe ON pe.id = tr.patrimonio_destino_id
  LEFT JOIN patrimonio_externo po ON po.id = tr.patrimonio_origem_id
`

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const month = query.month as string | undefined

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return db.prepare(`${SELECT} ORDER BY tr.data DESC`).all()
  }

  const [year, mon] = month.split('-')
  const startDate = `${year}-${mon}-01`
  const lastDay = new Date(Number(year), Number(mon), 0).getDate()
  const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`

  return db.prepare(`${SELECT}
    WHERE tr.data >= ? AND tr.data <= ?
    ORDER BY tr.data DESC
  `).all([startDate, endDate])
})
