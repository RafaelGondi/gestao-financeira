import { getQuery, getRouterParam } from 'h3'
import { loadPatrimonioProjecaoSerie } from '../../../utils/patrimonio-projecao-load'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  const query = getQuery(event)
  const numMeses = Math.min(Math.max(Number(query.meses) || 24, 6), 36)

  const loaded = await loadPatrimonioProjecaoSerie(id, numMeses)
  if (!loaded) throw createError({ statusCode: 404, message: 'Item não encontrado' })

  const { item, projecao, meses } = loaded

  return {
    meses,
    valorAlvo: item.valor_alvo,
    taxaAnualEfetiva: projecao.taxaAnualEfetiva,
    meses6: projecao.meses6,
    meses12: projecao.meses12,
    meses24: projecao.meses24,
  }
})
