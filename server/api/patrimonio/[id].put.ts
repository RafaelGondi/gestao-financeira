import db from '../../db/index'
import { readBody, getRouterParam } from 'h3'
import { parsePatrimonioBody } from '../../utils/patrimonio-body'
import type { PatrimonioRow } from '../../utils/patrimonio-map'

const CAMPOS = `
  nome = ?, tipo = ?, saldo_atual = ?, valor_alvo = ?, incluir_em_totais = ?,
  aporte_modo = ?, aporte_valor = ?, rendimento_modo = ?, rendimento_valor = ?,
  instituicao_key = ?, grupo_rendimento = ?, cdi_faixa_teto = ?, cdi_pct_ate_teto = ?, cdi_pct_acima = ?, cdi_dias_base = ?,
  data_fim = ?, icone = ?, cor = ?, notas = ?
`

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  const existing = db.prepare(`
    SELECT * FROM patrimonio_externo WHERE id = ? AND ativo = 1
  `).get(id) as PatrimonioRow | undefined

  if (!existing) throw createError({ statusCode: 404, message: 'Item não encontrado' })

  const vals = [...parsePatrimonioBody(body, existing), id]

  db.prepare(`UPDATE patrimonio_externo SET ${CAMPOS} WHERE id = ?`).run(vals)

  return db.prepare(`SELECT * FROM patrimonio_externo WHERE id = ?`).get(id)
})
