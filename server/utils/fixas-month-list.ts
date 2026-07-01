import db from '../db/index'
import { effectiveDate } from './dateUtils'
import { localDateStr } from './localDate'
import { isFixaLiquidada, resolveFixaForViewingMonth } from './liquidacao'

export type FixaMonthOccurrence = {
  id: number
  descricao: string
  valor: number
  tipo: string
  data: string
  data_inicio: string
  data_fim: string | null
  liquidado: boolean
  categoria?: string | null
  conta_id?: number | null
  cartao_id?: number | null
  parcelas?: number
  notas?: string | null
  nome_fatura?: string | null
  categoria_icone?: string | null
  categoria_cor?: string | null
  data_pagamento?: string | null
}

type CollectOptions = {
  month: string
  startDate: string
  endDate: string
  today?: string
  tipo?: 'receita' | 'despesa'
  contaId?: number
  /** Inclui liquidações de competências anteriores pagas neste mês (ex.: Flash jun pago em jul). */
  includeLatePayments?: boolean
  /** Tipos incluídos no caminho de liquidação atrasada. Padrão: mesmo que `tipo`, ou ambos. */
  latePaymentTipo?: 'receita' | 'despesa' | 'both'
}

/** Ocorrências fixas de conta bancária (sem cartão) visíveis no mês, alinhadas à liquidação. */
export function collectFixasSemCartaoForMonth(opts: CollectOptions): FixaMonthOccurrence[] {
  const {
    month,
    startDate,
    endDate,
    today = localDateStr(),
    tipo,
    contaId,
    includeLatePayments = true,
    latePaymentTipo,
  } = opts

  const tipoClause = tipo ? `AND t.tipo = '${tipo}'` : ''
  const contaClause = contaId != null ? 'AND t.conta_id = ?' : ''
  const baseParams = contaId != null ? [month, endDate, startDate, contaId] : [month, endDate, startDate]

  const fixasRaw = db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.tipo, t.categoria, t.conta_id, t.cartao_id,
      t.data_inicio, t.data_fim, t.parcelas, t.notas, t.nome_fatura,
      pf.nao_pago, pf.data_pagamento,
      cat.icone AS categoria_icone, cat.cor AS categoria_cor
    FROM transacoes t
    LEFT JOIN categorias cat ON cat.nome = t.categoria
    LEFT JOIN pagamentos_fixas pf ON pf.transacao_id = t.id AND pf.mes = ?
    WHERE t.fixa = 1 AND t.cartao_id IS NULL
      AND t.data_inicio <= ? AND (t.data_fim IS NULL OR t.data_fim >= ?)
      ${tipoClause} ${contaClause}
  `).all(baseParams) as any[]

  const items: FixaMonthOccurrence[] = []

  for (const t of fixasRaw) {
    const scheduled = effectiveDate(month, t.data_inicio)
    const liquidado = isFixaLiquidada({ nao_pago: t.nao_pago, data_pagamento: t.data_pagamento }, scheduled, today)
    const { include, date } = resolveFixaForViewingMonth(scheduled, t.data_pagamento, liquidado, startDate, endDate, today)
    if (!include) continue
    items.push({
      id: t.id,
      descricao: t.descricao,
      valor: t.valor,
      tipo: t.tipo,
      data: date,
      data_inicio: t.data_inicio,
      data_fim: t.data_fim ?? null,
      liquidado,
      categoria: t.categoria,
      conta_id: t.conta_id,
      cartao_id: t.cartao_id,
      parcelas: t.parcelas,
      notas: t.notas,
      nome_fatura: t.nome_fatura,
      categoria_icone: t.categoria_icone,
      categoria_cor: t.categoria_cor,
      data_pagamento: t.data_pagamento,
    })
  }

  if (!includeLatePayments) return items

  const lateTipo = latePaymentTipo ?? tipo ?? 'both'
  const lateTipoClause =
    lateTipo === 'both' ? '' : `AND t.tipo = '${lateTipo}'`
  const lateContaClause = contaId != null ? 'AND t.conta_id = ?' : ''
  const lateParams = contaId != null
    ? [startDate, endDate, month, contaId]
    : [startDate, endDate, month]

  const lateRows = db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.tipo, t.categoria, t.conta_id, t.cartao_id,
      t.data_inicio, t.data_fim, t.parcelas, t.notas, t.nome_fatura,
      pf.data_pagamento,
      cat.icone AS categoria_icone, cat.cor AS categoria_cor
    FROM pagamentos_fixas pf
    JOIN transacoes t ON t.id = pf.transacao_id
    LEFT JOIN categorias cat ON cat.nome = t.categoria
    WHERE t.fixa = 1 AND t.cartao_id IS NULL
      AND pf.nao_pago = 0
      AND pf.data_pagamento >= ? AND pf.data_pagamento <= ?
      AND pf.mes != ?
      ${lateTipoClause} ${lateContaClause}
  `).all(lateParams) as any[]

  for (const t of lateRows) {
    items.push({
      id: t.id,
      descricao: t.descricao,
      valor: t.valor,
      tipo: t.tipo,
      data: t.data_pagamento,
      data_inicio: t.data_inicio,
      data_fim: t.data_fim ?? null,
      liquidado: true,
      categoria: t.categoria,
      conta_id: t.conta_id,
      cartao_id: t.cartao_id,
      parcelas: t.parcelas,
      notas: t.notas,
      nome_fatura: t.nome_fatura,
      categoria_icone: t.categoria_icone,
      categoria_cor: t.categoria_cor,
      data_pagamento: t.data_pagamento,
    })
  }

  return items
}
