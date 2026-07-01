import db from '../../db/index'
import { getQuery } from 'h3'
import { localDateStr } from '../../utils/localDate'
import { collectFixasSemCartaoForMonth } from '../../utils/fixas-month-list'

function parcelaAtual(dataInicio: string, month: string): number {
  const [iy, im] = dataInicio.split('-').map(Number)
  const [y, m] = month.split('-').map(Number)
  return (y - iy) * 12 + (m - im) + 1
}

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const month = query.month as string | undefined
  const today = localDateStr()

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return db.prepare(`
      SELECT t.id, t.descricao, t.valor, t.categoria, t.fixa, t.parcelas, t.data, t.data_inicio, t.data_fim, t.conta_id, t.notas, t.nome_fatura,
        c.nome AS conta_nome, c.banco_key,
        CASE
          WHEN t.despago = 1 THEN 0
          WHEN t.fixa = 1 THEN
            CASE WHEN t.data_fim IS NOT NULL AND t.data_fim < ? THEN 2 ELSE 1 END
          WHEN t.data <= ? THEN 1 ELSE 0
        END AS recebido
      FROM transacoes t
      LEFT JOIN contas c ON c.id = t.conta_id
      WHERE t.tipo = 'receita'
      ORDER BY t.fixa DESC, t.data DESC
    `).all([today, today])
  }

  const [year, mon] = month.split('-')
  const startDate = `${year}-${mon}-01`
  const lastDay = new Date(Number(year), Number(mon), 0).getDate()
  const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`

  const avulsas = db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, 0 AS fixa, 0 AS parcelas, t.data, NULL AS data_inicio, NULL AS data_fim, t.conta_id, t.notas, t.nome_fatura,
      c.nome AS conta_nome, c.banco_key,
      cat.cor AS categoria_cor, cat.icone AS categoria_icone,
      CASE WHEN t.despago = 1 THEN 0 WHEN t.pago = 1 OR t.data <= ? THEN 1 ELSE 0 END AS recebido
    FROM transacoes t
    LEFT JOIN contas c ON c.id = t.conta_id
    LEFT JOIN categorias cat ON cat.nome = t.categoria
    WHERE t.tipo = 'receita' AND t.fixa = 0 AND t.data >= ? AND t.data <= ?
    ORDER BY t.data DESC
  `).all([today, startDate, endDate])

  const fixas = collectFixasSemCartaoForMonth({
    month,
    startDate,
    endDate,
    today,
    tipo: 'receita',
    includeLatePayments: true,
  }).map(t => {
    const recebido = t.liquidado ? 1 : (t.data > today ? 0 : 2)
    return {
      id: t.id,
      descricao: t.descricao,
      valor: t.valor,
      categoria: t.categoria,
      fixa: 1,
      parcelas: t.parcelas ?? 0,
      data: t.data,
      data_inicio: t.data_inicio,
      data_fim: t.data_fim,
      conta_id: t.conta_id,
      notas: t.notas,
      nome_fatura: t.nome_fatura,
      conta_nome: null as string | null,
      banco_key: null as string | null,
      categoria_cor: t.categoria_cor,
      categoria_icone: t.categoria_icone,
      recebido,
      parcela_atual: t.parcelas && t.parcelas > 0 ? parcelaAtual(t.data_inicio, month) : null,
    }
  })

  // Enriquecer conta_nome / banco_key das fixas
  const contaIds = [...new Set(fixas.map(f => f.conta_id).filter(Boolean))] as number[]
  if (contaIds.length) {
    const contasMap = new Map(
      (db.prepare(`SELECT id, nome, banco_key FROM contas WHERE id IN (${contaIds.map(() => '?').join(',')})`)
        .all(contaIds) as { id: number; nome: string; banco_key: string }[])
        .map(c => [c.id, c]),
    )
    for (const f of fixas) {
      if (f.conta_id && contasMap.has(f.conta_id)) {
        const c = contasMap.get(f.conta_id)!
        f.conta_nome = c.nome
        f.banco_key = c.banco_key
      }
    }
  }

  return [...fixas, ...avulsas]
})
