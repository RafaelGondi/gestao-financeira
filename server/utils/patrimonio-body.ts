import type { PatrimonioRow } from './patrimonio-map'
import { resolveInstituicaoForSave } from './patrimonio-instituicao'

function parseCdiDiasBase(
  body: Record<string, unknown>,
  rendimento_modo: string,
  existing?: PatrimonioRow | null,
) {
  if (rendimento_modo !== 'cdi_pct' && rendimento_modo !== 'cdi_faixas') {
    return existing?.cdi_dias_base === 'corridos' ? 'corridos' : 'uteis'
  }
  return body.cdi_dias_base === 'corridos' ? 'corridos' : 'uteis'
}

function faixaValue<T>(
  isFaixas: boolean,
  bodyValue: T | null | undefined,
  existingValue: T | null | undefined,
): T | null {
  if (isFaixas) return bodyValue ?? null
  return existingValue ?? null
}

export function parsePatrimonioBody(body: Record<string, unknown>, existing?: PatrimonioRow | null) {
  const rendimento_modo = (body.rendimento_modo as string) ?? existing?.rendimento_modo ?? 'nenhum'
  const isFaixas = rendimento_modo === 'cdi_faixas'
  const instituicao = resolveInstituicaoForSave(body, rendimento_modo, existing)

  if (isFaixas && !instituicao.instituicao_key && !instituicao.grupo_rendimento) {
    throw createError({ statusCode: 400, message: 'Instituição é obrigatória para CDI por faixas' })
  }

  return [
    body.nome,
    body.tipo ?? existing?.tipo ?? 'outro',
    body.saldo_atual ?? existing?.saldo_atual ?? 0,
    body.valor_alvo ?? null,
    body.incluir_em_totais ? 1 : 0,
    body.aporte_modo ?? existing?.aporte_modo ?? 'nenhum',
    body.aporte_valor ?? null,
    rendimento_modo,
    isFaixas ? null : (body.rendimento_valor ?? null),
    instituicao.instituicao_key,
    instituicao.grupo_rendimento,
    faixaValue(isFaixas, body.cdi_faixa_teto as number | null | undefined, existing?.cdi_faixa_teto),
    faixaValue(isFaixas, body.cdi_pct_ate_teto as number | null | undefined, existing?.cdi_pct_ate_teto),
    faixaValue(isFaixas, body.cdi_pct_acima as number | null | undefined, existing?.cdi_pct_acima),
    parseCdiDiasBase(body, rendimento_modo, existing),
    body.data_fim ?? existing?.data_fim ?? null,
    body.icone ?? existing?.icone ?? 'i-lucide-landmark',
    body.cor ?? existing?.cor ?? '#6366f1',
    body.notas?.toString().trim() || existing?.notas || null,
  ]
}
