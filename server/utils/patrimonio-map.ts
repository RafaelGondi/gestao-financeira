import type { AporteModo, PatrimonioInput, RendimentoModo, PatrimonioTipo } from './patrimonio-projecao'

export interface PatrimonioRow {
  id: number
  nome: string
  tipo: PatrimonioTipo
  saldo_atual: number
  valor_alvo: number | null
  incluir_em_totais: number
  aporte_modo: string
  aporte_valor: number | null
  rendimento_modo: string
  rendimento_valor: number | null
  instituicao_key: string | null
  grupo_rendimento: string | null
  cdi_faixa_teto: number | null
  cdi_pct_ate_teto: number | null
  cdi_pct_acima: number | null
  cdi_dias_base: string | null
  data_fim: string | null
  icone: string
  cor: string
  notas: string | null
  ativo: number
  created_at: string
}

export interface MovimentoRow {
  id: number
  patrimonio_id: number
  tipo: string
  valor: number
  data: string
  notas: string | null
  transferencia_id?: number | null
}

export function toPatrimonioInput(item: PatrimonioRow): PatrimonioInput {
  return {
    id: item.id,
    saldo_atual: item.saldo_atual,
    valor_alvo: item.valor_alvo,
    aporte_modo: item.aporte_modo as AporteModo,
    aporte_valor: item.aporte_valor,
    rendimento_modo: item.rendimento_modo as RendimentoModo,
    rendimento_valor: item.rendimento_valor,
    instituicao_key: item.instituicao_key ?? null,
    grupo_rendimento: item.grupo_rendimento ?? null,
    cdi_faixa_teto: item.cdi_faixa_teto,
    cdi_pct_ate_teto: item.cdi_pct_ate_teto,
    cdi_pct_acima: item.cdi_pct_acima,
    cdi_dias_base: item.cdi_dias_base as PatrimonioInput['cdi_dias_base'],
    data_fim: item.data_fim,
  }
}

export function mapPatrimonioRow(item: PatrimonioRow, movimentos: MovimentoRow[], projecao: import('./patrimonio-projecao').PatrimonioProjecao) {
  return {
    ...item,
    incluir_em_totais: item.incluir_em_totais === 1,
    projecao,
    movimentos: movimentos.filter(m => m.patrimonio_id === item.id),
  }
}
