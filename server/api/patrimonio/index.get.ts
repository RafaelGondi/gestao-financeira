import db from '../../db/index'
import { fetchCdiContext } from '../../utils/cdi'
import { computeAllPatrimonioProjecoes } from '../../utils/patrimonio-projecao'
import { mapPatrimonioRow, toPatrimonioInput, type MovimentoRow, type PatrimonioRow } from '../../utils/patrimonio-map'

export default defineEventHandler(async () => {
  const cdi = await fetchCdiContext()

  const itens = db.prepare(`
    SELECT * FROM patrimonio_externo
    WHERE ativo = 1
    ORDER BY nome ASC
  `).all() as PatrimonioRow[]

  const movimentos = db.prepare(`
    SELECT * FROM patrimonio_movimentos ORDER BY data DESC, id DESC
  `).all() as MovimentoRow[]

  const inputs = itens.map(toPatrimonioInput)
  const projecoes = computeAllPatrimonioProjecoes(inputs, cdi)

  const mapped = itens.map(item =>
    mapPatrimonioRow(item, movimentos, projecoes.get(item.id)!),
  )

  const totalAtual = mapped.reduce((s, i) => s + i.saldo_atual, 0)
  const totalIncluidoTotais = mapped.filter(i => i.incluir_em_totais).reduce((s, i) => s + i.saldo_atual, 0)
  const totalProjecao12 = mapped.reduce((s, i) => s + i.projecao.meses12, 0)

  return {
    cdi: {
      anual: cdi.cdiAnual,
      dataReferencia: cdi.dataReferencia,
      fonte: cdi.fonte,
      mensalFonte: cdi.mensalFonte,
      mensalHistorico: cdi.mensal.slice(-6),
      mensalMeses: cdi.mensal.length,
    },
    totais: { atual: totalAtual, incluidoTotais: totalIncluidoTotais, projecao12: totalProjecao12 },
    itens: mapped,
  }
})
