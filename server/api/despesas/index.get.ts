import db from '../../db/index'
import { getQuery } from 'h3'
import { faturaDateRange, getFaturaJanelaMap, getCartoesParaMes } from '../../utils/fatura'
import { localDateStr } from '../../utils/localDate'

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
      SELECT t.id, t.descricao, t.valor, t.categoria, t.fixa, t.parcelas, t.data, t.data_inicio, t.data_fim, t.conta_id, t.cartao_id, t.notas, t.nome_fatura,
        c.nome AS conta_nome, c.banco_key, cr.nome AS cartao_nome,
        cat.cor AS categoria_cor, cat.icone AS categoria_icone,
        CASE
          WHEN t.fixa = 1 THEN
            CASE WHEN t.data_fim IS NOT NULL AND t.data_fim < ? THEN 2 ELSE 1 END
          WHEN t.data <= ? THEN 1 ELSE 0
        END AS pago
      FROM transacoes t
      LEFT JOIN contas c ON c.id = t.conta_id
      LEFT JOIN cartoes cr ON cr.id = t.cartao_id
      LEFT JOIN categorias cat ON cat.nome = t.categoria
      WHERE t.tipo = 'despesa'
      ORDER BY t.fixa DESC, t.data DESC
    `).all([today, today])
  }

  const [year, mon] = month.split('-')
  const startDate = `${year}-${mon}-01`
  const lastDay = new Date(Number(year), Number(mon), 0).getDate()
  const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`

  // Non-card avulsas: use calendar month as before
  const avulsasNormais = db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, 0 AS fixa, 0 AS parcelas, t.data, NULL AS data_inicio, NULL AS data_fim,
      t.conta_id, t.cartao_id, t.notas, t.nome_fatura, c.nome AS conta_nome, c.banco_key, NULL AS cartao_nome,
      cat.cor AS categoria_cor, cat.icone AS categoria_icone,
      CASE WHEN t.data <= ? THEN 1 ELSE 0 END AS pago
    FROM transacoes t
    LEFT JOIN contas c ON c.id = t.conta_id
    LEFT JOIN categorias cat ON cat.nome = t.categoria
    WHERE t.tipo = 'despesa' AND t.fixa = 0 AND t.cartao_id IS NULL
      AND t.data >= ? AND t.data <= ?
    ORDER BY t.data DESC
  `).all([today, startDate, endDate])

  // Card avulsas: per-cartão usando o range correto (com suporte a fatura de transição)
  const prevYear = Number(mon) === 1 ? Number(year) - 1 : Number(year)
  const prevMon = Number(mon) === 1 ? 12 : Number(mon) - 1
  const janelaMap = getFaturaJanelaMap(month)
  const cartoesAtivos = getCartoesParaMes(month)

  const avulsasCartao: any[] = []
  for (const c of cartoesAtivos) {
    const { startDate: fStart, endDate: fEnd } = janelaMap.get(c.id) ?? faturaDateRange(Number(year), Number(mon), c.melhor_data_compra)
    const rows = db.prepare(`
      SELECT t.id, t.descricao, t.valor, t.categoria, 0 AS fixa, 0 AS parcelas, t.data, NULL AS data_inicio, NULL AS data_fim,
        t.conta_id, t.cartao_id, t.notas, t.nome_fatura, NULL AS conta_nome, NULL AS banco_key,
        ? AS cartao_nome, ? AS cartao_banco_key, ? AS cartao_cor,
        cat.cor AS categoria_cor, cat.icone AS categoria_icone,
        CASE WHEN t.data <= ? THEN 1 ELSE 0 END AS pago
      FROM transacoes t
      LEFT JOIN categorias cat ON cat.nome = t.categoria
      WHERE t.tipo = 'despesa' AND t.fixa = 0 AND t.cartao_id = ? AND t.data >= ? AND t.data <= ?
      ORDER BY t.data DESC
    `).all([c.nome, c.banco_key, c.cor, today, c.id, fStart, fEnd])
    avulsasCartao.push(...rows)
  }

  const prevMonthStr = `${prevYear}-${String(prevMon).padStart(2, '0')}`

  const fixasRaw = db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, 1 AS fixa, t.parcelas,
      t.data_inicio, t.data_fim, t.conta_id, t.cartao_id, t.notas, t.nome_fatura,
      c.nome AS conta_nome, c.banco_key, cr.nome AS cartao_nome,
      cr.banco_key AS cartao_banco_key, cr.cor AS cartao_cor, cr.melhor_data_compra,
      cat.cor AS categoria_cor, cat.icone AS categoria_icone
    FROM transacoes t
    LEFT JOIN contas c ON c.id = t.conta_id
    LEFT JOIN cartoes cr ON cr.id = t.cartao_id
    LEFT JOIN categorias cat ON cat.nome = t.categoria
    WHERE t.tipo = 'despesa' AND t.fixa = 1
      AND t.data_inicio <= ?
      AND (t.data_fim IS NULL OR t.data_fim >= ?)
    ORDER BY t.data_inicio ASC
  `).all([endDate, startDate]) as any[]

  const fixas = fixasRaw.flatMap((t: any) => {
    const dayP = parseInt(t.data_inicio.slice(8, 10), 10)
    const cutoffT: number = t.cartao_id && t.melhor_data_compra > 1 ? t.melhor_data_compra : 1
    const calcMonth = (cutoffT > 1 && dayP >= cutoffT) ? prevMonthStr : month
    const effDate = effectiveDate(calcMonth, t.data_inicio)
    if (effDate < t.data_inicio) return []
    if (t.data_fim && effDate > t.data_fim) return []
    const { melhor_data_compra: _, ...rest } = t
    return [{
      ...rest,
      data: effDate,
      pago: effDate <= today ? 1 : 2,
      parcela_atual: t.parcelas > 0 ? parcelaAtual(t.data_inicio, calcMonth) : null
    }]
  })

  return [...fixas, ...avulsasNormais, ...avulsasCartao]
})
