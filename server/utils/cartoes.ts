import db from '../db/index'

/**
 * Retorna todos os cartões que estavam ativos em um determinado mês.
 * Cartões arquivados são incluídos se foram arquivados APÓS o mês consultado.
 * Cartões nunca arquivados (arquivado=0) são sempre incluídos.
 */
export function getCartoesParaMes(mes: string) {
  return db.prepare(`
    SELECT * FROM cartoes
    WHERE arquivado = 0 OR arquivado IS NULL
       OR (arquivado = 1 AND arquivado_em > ?)
    ORDER BY nome ASC
  `).all([mes]) as any[]
}
