import db from '../../db/index'
import { readBody } from 'h3'
import { parsePatrimonioBody } from '../../utils/patrimonio-body'

const CAMPOS = `
  nome, tipo, saldo_atual, valor_alvo, incluir_em_totais,
  aporte_modo, aporte_valor, rendimento_modo, rendimento_valor,
  instituicao_key, grupo_rendimento, cdi_faixa_teto, cdi_pct_ate_teto, cdi_pct_acima, cdi_dias_base,
  data_fim, icone, cor, notas
`

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const vals = parsePatrimonioBody(body)

  const result = db.prepare(`
    INSERT INTO patrimonio_externo (${CAMPOS})
    VALUES (${vals.map(() => '?').join(', ')})
  `).run(vals)

  return db.prepare(`SELECT * FROM patrimonio_externo WHERE id = ?`).get(result.lastInsertRowid)
})
