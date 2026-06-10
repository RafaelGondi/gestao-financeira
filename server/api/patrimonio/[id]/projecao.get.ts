import db from '../../../db/index'
import { getQuery, getRouterParam } from 'h3'
import { fetchCdiContext } from '../../../utils/cdi'
import {
  computePatrimonioProjecao,
  computePatrimonioSerieMensal,
} from '../../../utils/patrimonio-projecao'
import { toPatrimonioInput, type PatrimonioRow } from '../../../utils/patrimonio-map'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  const query = getQuery(event)
  const numMeses = Math.min(Math.max(Number(query.meses) || 24, 6), 36)

  const item = db.prepare(`
    SELECT * FROM patrimonio_externo WHERE id = ? AND ativo = 1
  `).get(id) as PatrimonioRow | undefined

  if (!item) throw createError({ statusCode: 404, message: 'Item não encontrado' })

  const cdi = await fetchCdiContext()
  const input = toPatrimonioInput(item)
  const projecao = computePatrimonioProjecao(input, cdi)

  let grupoMembros: { id: number; item: ReturnType<typeof toPatrimonioInput> }[] | undefined
  if (item.rendimento_modo === 'cdi_faixas' && item.grupo_rendimento?.trim()) {
    const grupo = item.grupo_rendimento.trim()
    const siblings = db.prepare(`
      SELECT * FROM patrimonio_externo
      WHERE ativo = 1 AND rendimento_modo = 'cdi_faixas' AND trim(grupo_rendimento) = ?
    `).all(grupo) as PatrimonioRow[]
    if (siblings.length > 1) {
      grupoMembros = siblings.map(s => ({ id: s.id, item: toPatrimonioInput(s) }))
    }
  }

  const meses = computePatrimonioSerieMensal(input, numMeses, cdi, { grupoMembros })

  return {
    meses,
    valorAlvo: item.valor_alvo,
    taxaAnualEfetiva: projecao.taxaAnualEfetiva,
    meses6: projecao.meses6,
    meses12: projecao.meses12,
    meses24: projecao.meses24,
  }
})
