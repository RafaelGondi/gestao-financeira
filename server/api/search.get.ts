import db from '../db/index'
import { getQuery } from 'h3'

interface Row {
  id: number
  descricao: string
  nome_fatura: string | null
  notas: string | null
  valor: number
  tipo: 'receita' | 'despesa'
  categoria: string | null
  data: string | null
  data_inicio: string | null
  fixa: number
  cartao_id: number | null
  conta_id: number | null
  conta_nome: string | null
  cartao_nome: string | null
}

export default defineEventHandler((event) => {
  const { q } = getQuery(event)

  if (!q || String(q).trim().length < 2) return { results: [] }

  const term = `%${String(q).trim()}%`

  const rows = db.prepare(`
    SELECT
      t.id, t.descricao, t.nome_fatura, t.notas,
      t.valor, t.tipo, t.categoria,
      t.data, t.data_inicio, t.fixa,
      t.cartao_id, t.conta_id,
      co.nome as conta_nome,
      ca.nome as cartao_nome
    FROM transacoes t
    LEFT JOIN contas co ON co.id = t.conta_id
    LEFT JOIN cartoes ca ON ca.id = t.cartao_id
    WHERE t.descricao LIKE ? OR t.nome_fatura LIKE ?
    ORDER BY COALESCE(t.data, t.data_inicio) DESC
    LIMIT 100
  `).all([term, term]) as Row[]

  return {
    results: rows.map(r => ({
      id: r.id,
      descricao: r.descricao,
      nome_fatura: r.nome_fatura,
      notas: r.notas,
      valor: r.valor,
      tipo: r.tipo,
      categoria: r.categoria,
      data: r.data ?? r.data_inicio,
      fixa: r.fixa === 1,
      origem: r.cartao_nome ?? r.conta_nome ?? null,
      origemTipo: r.cartao_id ? 'cartao' : r.conta_id ? 'conta' : null,
    })),
  }
})
