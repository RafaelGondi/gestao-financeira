import db from '../../db/index'

export default defineEventHandler(() => {
  const snapshots = db.prepare(`
    SELECT s.id, s.nome, s.criado_em, s.automatico,
      COUNT(sd.id) as total_meses
    FROM snapshots s
    LEFT JOIN snapshot_dados sd ON sd.snapshot_id = s.id
    GROUP BY s.id
    ORDER BY s.criado_em DESC
  `).all() as any[]

  return snapshots
})
