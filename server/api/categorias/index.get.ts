import db from '../../db/index'

export default defineEventHandler(() => {
  const rows = db.prepare(`
    SELECT DISTINCT categoria FROM transacoes
    WHERE categoria IS NOT NULL AND categoria != ''
    ORDER BY categoria ASC
  `).all() as { categoria: string }[]
  return rows.map(r => r.categoria)
})
