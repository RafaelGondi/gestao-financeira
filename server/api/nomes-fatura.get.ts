import db from '../db/index'

export default defineEventHandler(() => {
  const rows = db.prepare(`
    SELECT DISTINCT nome_fatura
    FROM transacoes
    WHERE nome_fatura IS NOT NULL AND nome_fatura != ''
    ORDER BY nome_fatura ASC
  `).all() as { nome_fatura: string }[]

  return rows.map(r => r.nome_fatura)
})
