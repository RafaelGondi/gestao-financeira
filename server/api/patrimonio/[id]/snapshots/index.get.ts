import db from '../../../../db/index'
import { getRouterParam } from 'h3'

export default defineEventHandler((event) => {
  const patrimonioId = Number(getRouterParam(event, 'id'))
  if (!patrimonioId) throw createError({ statusCode: 400, message: 'ID inválido' })

  const item = db.prepare(`
    SELECT id FROM patrimonio_externo WHERE id = ? AND ativo = 1
  `).get(patrimonioId)
  if (!item) throw createError({ statusCode: 404, message: 'Item não encontrado' })

  return db.prepare(`
    SELECT s.id, s.nome, s.criado_em, s.automatico, s.taxa_anual_efetiva,
      COUNT(sd.id) as total_meses
    FROM patrimonio_snapshots s
    LEFT JOIN patrimonio_snapshot_dados sd ON sd.snapshot_id = s.id
    WHERE s.patrimonio_id = ?
    GROUP BY s.id
    ORDER BY s.criado_em DESC
  `).all(patrimonioId)
})
