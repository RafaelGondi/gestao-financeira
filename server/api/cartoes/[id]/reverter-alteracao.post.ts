import db from '../../../db/index'
import { getRouterParam } from 'h3'

/**
 * Reverte uma alteração de cutoff/vencimento feita via alterar-cutoff.
 * Recebe o ID do cartão NOVO (substituto) e restaura o cartão antigo.
 */
export default defineEventHandler((event) => {
  const newId = Number(getRouterParam(event, 'id'))
  if (!newId || isNaN(newId)) throw createError({ statusCode: 400, statusMessage: 'ID inválido' })

  // Encontrar o cartão antigo que foi arquivado e substituído por este
  const cartaoAntigo = db.prepare(`
    SELECT * FROM cartoes WHERE substituido_por = ? AND arquivado = 1
  `).get([newId]) as any

  if (!cartaoAntigo) throw createError({ statusCode: 404, statusMessage: 'Nenhuma alteração encontrada para reverter' })

  db.transaction(() => {
    // 1. Devolver todas as faturas ao cartão antigo
    db.prepare(`UPDATE faturas SET cartao_id = ? WHERE cartao_id = ?`).run([cartaoAntigo.id, newId])

    // 2. Remover todas as despesas fixas copiadas pro novo cartão
    db.prepare(`DELETE FROM transacoes WHERE cartao_id = ? AND fixa = 1 AND tipo = 'despesa'`).run([newId])

    // 3. Deletar o novo cartão
    db.prepare(`DELETE FROM cartoes WHERE id = ?`).run([newId])

    // 4. Restaurar o cartão antigo
    db.prepare(`
      UPDATE cartoes SET arquivado = 0, arquivado_a_partir_de = NULL, substituido_por = NULL
      WHERE id = ?
    `).run([cartaoAntigo.id])
  })()

  return { success: true, cartao_restaurado_id: cartaoAntigo.id }
})
