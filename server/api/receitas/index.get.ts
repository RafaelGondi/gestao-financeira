import db from '../../db/index'
import { getQuery } from 'h3'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const month = query.month as string | undefined

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return db.prepare(`
      SELECT t.id, t.descricao, t.valor, t.categoria, t.fixa, t.data, t.data_inicio, t.data_fim, t.conta_id,
        c.nome AS conta_nome, c.banco_key,
        CASE
          WHEN t.fixa = 1 THEN
            CASE WHEN t.data_fim IS NOT NULL AND t.data_fim < date('now') THEN 2 ELSE 1 END
          WHEN t.data <= date('now') THEN 1 ELSE 0
        END AS recebido
      FROM transacoes t
      LEFT JOIN contas c ON c.id = t.conta_id
      WHERE t.tipo = 'receita'
      ORDER BY t.fixa DESC, t.data DESC
    `).all()
  }

  const [year, mon] = month.split('-')
  const startDate = `${year}-${mon}-01`
  const lastDay = new Date(Number(year), Number(mon), 0).getDate()
  const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`

  const avulsas = db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, 0 AS fixa, t.data, NULL AS data_inicio, NULL AS data_fim, t.conta_id,
      c.nome AS conta_nome, c.banco_key,
      CASE WHEN t.data <= date('now') THEN 1 ELSE 0 END AS recebido
    FROM transacoes t
    LEFT JOIN contas c ON c.id = t.conta_id
    WHERE t.tipo = 'receita' AND t.fixa = 0 AND t.data >= ? AND t.data <= ?
    ORDER BY t.data DESC
  `).all([startDate, endDate])

  const fixas = db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, 1 AS fixa,
      ? || '-' || substr(t.data_inicio, 9, 2) AS data,
      t.data_inicio, t.data_fim, t.conta_id,
      c.nome AS conta_nome, c.banco_key,
      CASE WHEN ? || '-' || substr(t.data_inicio, 9, 2) <= date('now') THEN 1 ELSE 2 END AS recebido
    FROM transacoes t
    LEFT JOIN contas c ON c.id = t.conta_id
    WHERE t.tipo = 'receita' AND t.fixa = 1
      AND t.data_inicio <= ?
      AND (t.data_fim IS NULL OR t.data_fim >= ?)
    ORDER BY t.data_inicio ASC
  `).all([month, month, endDate, startDate])

  return [...fixas, ...avulsas]
})
