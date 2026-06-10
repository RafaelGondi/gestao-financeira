import db from '../../db/index'
import { readBody, getRouterParam } from 'h3'

const CAMPOS = `
  nome = ?, tipo = ?, saldo_atual = ?, valor_alvo = ?, incluir_em_totais = ?,
  aporte_modo = ?, aporte_valor = ?, rendimento_modo = ?, rendimento_valor = ?,
  grupo_rendimento = ?, cdi_faixa_teto = ?, cdi_pct_ate_teto = ?, cdi_pct_acima = ?, cdi_dias_base = ?,
  data_fim = ?, icone = ?, cor = ?, notas = ?
`

function parseCdiDiasBase(body: Record<string, unknown>, rendimento_modo: string) {
  if (rendimento_modo !== 'cdi_pct' && rendimento_modo !== 'cdi_faixas') return 'uteis'
  return body.cdi_dias_base === 'corridos' ? 'corridos' : 'uteis'
}

function parseBody(body: Record<string, unknown>) {
  const rendimento_modo = (body.rendimento_modo as string) ?? 'nenhum'
  const isFaixas = rendimento_modo === 'cdi_faixas'
  const isCdi = rendimento_modo === 'cdi_pct' || isFaixas

  return [
    body.nome,
    body.tipo ?? 'outro',
    body.saldo_atual ?? 0,
    body.valor_alvo ?? null,
    body.incluir_em_totais ? 1 : 0,
    body.aporte_modo ?? 'nenhum',
    body.aporte_valor ?? null,
    rendimento_modo,
    isFaixas ? null : (body.rendimento_valor ?? null),
    isFaixas ? (body.grupo_rendimento?.toString().trim() || null) : null,
    isFaixas ? (body.cdi_faixa_teto ?? null) : null,
    isFaixas ? (body.cdi_pct_ate_teto ?? null) : null,
    isFaixas ? (body.cdi_pct_acima ?? null) : null,
    isCdi ? parseCdiDiasBase(body, rendimento_modo) : 'uteis',
    body.data_fim ?? null,
    body.icone ?? 'i-lucide-landmark',
    body.cor ?? '#6366f1',
    body.notas?.toString().trim() || null,
  ]
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const vals = [...parseBody(body), id]

  db.prepare(`UPDATE patrimonio_externo SET ${CAMPOS} WHERE id = ?`).run(vals)

  return db.prepare(`SELECT * FROM patrimonio_externo WHERE id = ?`).get(id)
})
