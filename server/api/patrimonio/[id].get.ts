import db from '../../db/index'
import { getRouterParam } from 'h3'
import { fetchCdiContext } from '../../utils/cdi'
import {
  computeAllPatrimonioProjecoes,
  computePatrimonioProjecao,
  type PatrimonioInput,
} from '../../utils/patrimonio-projecao'
import { mapPatrimonioRow, toPatrimonioInput, type MovimentoRow, type PatrimonioRow } from '../../utils/patrimonio-map'

function loadGrupoMembros(item: PatrimonioRow, allItens: PatrimonioRow[]): PatrimonioInput[] | undefined {
  if (item.rendimento_modo !== 'cdi_faixas' || !item.grupo_rendimento?.trim()) return undefined
  const grupo = item.grupo_rendimento.trim()
  return allItens
    .filter(i => i.rendimento_modo === 'cdi_faixas' && i.grupo_rendimento?.trim() === grupo)
    .map(toPatrimonioInput)
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  const item = db.prepare(`
    SELECT * FROM patrimonio_externo WHERE id = ? AND ativo = 1
  `).get(id) as PatrimonioRow | undefined

  if (!item) throw createError({ statusCode: 404, message: 'Item não encontrado' })

  const cdi = await fetchCdiContext()
  const allItens = db.prepare(`SELECT * FROM patrimonio_externo WHERE ativo = 1`).all() as PatrimonioRow[]
  const movimentos = db.prepare(`
    SELECT * FROM patrimonio_movimentos WHERE patrimonio_id = ? ORDER BY data DESC, id DESC
  `).all(id) as MovimentoRow[]

  const inputs = allItens.map(toPatrimonioInput)
  const projecoes = computeAllPatrimonioProjecoes(inputs, cdi)
  const projecao = projecoes.get(id) ?? computePatrimonioProjecao(toPatrimonioInput(item), cdi)

  const grupoInputs = loadGrupoMembros(item, allItens)
  const grupoMembros = grupoInputs && grupoInputs.length > 1
    ? allItens
      .filter(i => i.rendimento_modo === 'cdi_faixas' && i.grupo_rendimento?.trim() === item.grupo_rendimento?.trim())
      .map(i => ({ id: i.id, item: toPatrimonioInput(i) }))
    : undefined

  return {
    cdi: {
      anual: cdi.cdiAnual,
      dataReferencia: cdi.dataReferencia,
      fonte: cdi.fonte,
    },
    item: mapPatrimonioRow(item, movimentos, projecao),
    grupoMembros: grupoMembros?.map(m => ({
      id: m.id,
      nome: allItens.find(i => i.id === m.id)?.nome ?? '',
      saldo_atual: allItens.find(i => i.id === m.id)?.saldo_atual ?? 0,
    })),
  }
})
