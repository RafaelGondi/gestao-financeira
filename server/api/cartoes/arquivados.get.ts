import db from '../../db/index'

export default defineEventHandler(() => {
  return db.prepare(`
    SELECT id, nome, banco, banco_key, limite, melhor_data_compra, vencimento, cor
    FROM cartoes WHERE arquivado = 1
    ORDER BY nome ASC
  `).all()
})
