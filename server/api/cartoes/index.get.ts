import db from '../../db/index'

export default defineEventHandler(() => {
  const cartoes = db.prepare(`
    SELECT id, nome, banco, banco_key, limite, melhor_data_compra, vencimento, created_at
    FROM cartoes
    ORDER BY nome ASC
  `).all()
  return cartoes
})
