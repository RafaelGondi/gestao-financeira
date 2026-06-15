import db from '../db/index'
import { fetchCdiContext } from './cdi'
import {
  computePatrimonioProjecao,
  computePatrimonioSerieMensal,
} from './patrimonio-projecao'
import { toPatrimonioInput, type PatrimonioRow } from './patrimonio-map'
import { instituicaoGrupoMatch } from './patrimonio-instituicao'

function loadGrupoMembros(item: PatrimonioRow) {
  if (item.rendimento_modo !== 'cdi_faixas') return undefined
  if (!item.instituicao_key?.trim() && !item.grupo_rendimento?.trim()) return undefined

  const siblings = db.prepare(`
    SELECT * FROM patrimonio_externo
    WHERE ativo = 1 AND rendimento_modo = 'cdi_faixas'
  `).all() as PatrimonioRow[]

  const matched = siblings.filter(s => instituicaoGrupoMatch(item, s))
  if (matched.length <= 1) return undefined

  return matched.map(s => ({ id: s.id, item: toPatrimonioInput(s) }))
}

export async function loadPatrimonioProjecaoSerie(patrimonioId: number, numMeses: number) {
  const item = db.prepare(`
    SELECT * FROM patrimonio_externo WHERE id = ? AND ativo = 1
  `).get(patrimonioId) as PatrimonioRow | undefined

  if (!item) return null

  const cdi = await fetchCdiContext()
  const input = toPatrimonioInput(item)
  const projecao = computePatrimonioProjecao(input, cdi)
  const grupoMembros = loadGrupoMembros(item)
  const meses = computePatrimonioSerieMensal(input, numMeses, cdi, { grupoMembros })

  return { item, projecao, meses }
}
