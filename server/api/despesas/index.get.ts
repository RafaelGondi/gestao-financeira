import db from '../../db/index'
import { getQuery } from 'h3'
import { transacaoFaturaMonth } from '../../utils/fatura'

function parcelaAtual(dataInicio: string, month: string): number {
  const [iy, im] = dataInicio.split('-').map(Number)
  const [y, m] = month.split('-').map(Number)
  return (y - iy) * 12 + (m - im) + 1
}

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const month = query.month as string | undefined

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return db.prepare(`
      SELECT t.id, t.descricao, t.valor, t.categoria, t.fixa, t.parcelas, t.data, t.data_inicio, t.data_fim, t.conta_id, t.cartao_id,
        c.nome AS conta_nome, c.banco_key, cr.nome AS cartao_nome,
        CASE
          WHEN t.fixa = 1 THEN
            CASE WHEN t.data_fim IS NOT NULL AND t.data_fim < date('now') THEN 2 ELSE 1 END
          WHEN t.data <= date('now') THEN 1 ELSE 0
        END AS pago
      FROM transacoes t
      LEFT JOIN contas c ON c.id = t.conta_id
      LEFT JOIN cartoes cr ON cr.id = t.cartao_id
      WHERE t.tipo = 'despesa'
      ORDER BY t.fixa DESC, t.data DESC
    `).all()
  }

  const [year, mon] = month.split('-')
  const startDate = `${year}-${mon}-01`
  const lastDay = new Date(Number(year), Number(mon), 0).getDate()
  const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`

  // Non-card avulsas: use calendar month as before
  const avulsasNormais = db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, 0 AS fixa, 0 AS parcelas, t.data, NULL AS data_inicio, NULL AS data_fim,
      t.conta_id, t.cartao_id, c.nome AS conta_nome, c.banco_key, NULL AS cartao_nome,
      CASE WHEN t.data <= date('now') THEN 1 ELSE 0 END AS pago
    FROM transacoes t
    LEFT JOIN contas c ON c.id = t.conta_id
    WHERE t.tipo = 'despesa' AND t.fixa = 0 AND t.cartao_id IS NULL
      AND t.data >= ? AND t.data <= ?
    ORDER BY t.data DESC
  `).all([startDate, endDate])

  // Card avulsas: fetch from prev month's cutoff to end of current month, then filter by fatura month
  // We grab a broad range (prev month start to current month end) and compute fatura month in JS
  const prevYear = Number(mon) === 1 ? Number(year) - 1 : Number(year)
  const prevMon = Number(mon) === 1 ? 12 : Number(mon) - 1
  const broadStart = `${prevYear}-${String(prevMon).padStart(2, '0')}-01`

  const avulsasCartaoRaw = db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, 0 AS fixa, 0 AS parcelas, t.data, NULL AS data_inicio, NULL AS data_fim,
      t.conta_id, t.cartao_id, NULL AS conta_nome, NULL AS banco_key, cr.nome AS cartao_nome,
      cr.melhor_data_compra,
      CASE WHEN t.data <= date('now') THEN 1 ELSE 0 END AS pago
    FROM transacoes t
    JOIN cartoes cr ON cr.id = t.cartao_id
    WHERE t.tipo = 'despesa' AND t.fixa = 0 AND t.cartao_id IS NOT NULL
      AND t.data >= ? AND t.data <= ?
    ORDER BY t.data DESC
  `).all([broadStart, endDate]) as any[]

  const avulsasCartao = avulsasCartaoRaw.filter(t => {
    const fm = transacaoFaturaMonth(t.data, t.melhor_data_compra)
    return fm === month
  }).map(({ melhor_data_compra: _, ...t }) => t)

  const fixas = (db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, 1 AS fixa, t.parcelas,
      ? || '-' || substr(t.data_inicio, 9, 2) AS data,
      t.data_inicio, t.data_fim, t.conta_id, t.cartao_id,
      c.nome AS conta_nome, c.banco_key, cr.nome AS cartao_nome,
      CASE WHEN ? || '-' || substr(t.data_inicio, 9, 2) <= date('now') THEN 1 ELSE 2 END AS pago
    FROM transacoes t
    LEFT JOIN contas c ON c.id = t.conta_id
    LEFT JOIN cartoes cr ON cr.id = t.cartao_id
    WHERE t.tipo = 'despesa' AND t.fixa = 1
      AND t.data_inicio <= ?
      AND (t.data_fim IS NULL OR t.data_fim >= ?)
    ORDER BY t.data_inicio ASC
  `).all([month, month, endDate, startDate]) as any[]).map(t => ({
    ...t,
    parcela_atual: t.parcelas > 0 ? parcelaAtual(t.data_inicio, month) : null
  }))

  return [...fixas, ...avulsasNormais, ...avulsasCartao]
})
