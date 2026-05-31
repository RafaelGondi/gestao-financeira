import db from '../../../db/index'
import { getRouterParam, readBody } from 'h3'
import { calcFaturaMonth } from '../../../utils/fatura'

interface Body {
  destino_id: number
  mes: string // YYYY-MM — contexto do mês visualizado
  lancamento_ids: number[]
}

function addMonths(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const total = (m - 1) + n
  const ny = y + Math.floor(total / 12)
  const nm = (total % 12) + 1
  const lastDay = new Date(ny, nm, 0).getDate()
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`
}

function effectiveDateForMonth(mes: string, dataInicio: string): string {
  const day = parseInt(dataInicio.slice(8, 10), 10)
  const [y, m] = mes.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return `${mes}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
}

export default defineEventHandler(async (event) => {
  const origemId = Number(getRouterParam(event, 'id'))
  if (!origemId || isNaN(origemId)) throw createError({ statusCode: 400, statusMessage: 'ID inválido' })

  const body = await readBody<Body>(event)
  const { destino_id, mes, lancamento_ids } = body

  if (!destino_id || !mes || !lancamento_ids?.length)
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos' })

  if (!/^\d{4}-\d{2}$/.test(mes))
    throw createError({ statusCode: 400, statusMessage: 'Mês inválido' })

  const destino = db.prepare(`SELECT id FROM cartoes WHERE id = ?`).get([destino_id])
  if (!destino) throw createError({ statusCode: 404, statusMessage: 'Cartão destino não encontrado' })

  // Bloqueia transferência se a fatura do mês já foi paga
  const faturaOrigem = db.prepare(`SELECT pago FROM faturas WHERE cartao_id = ? AND mes = ?`).get([origemId, mes]) as any
  if (faturaOrigem?.pago) throw createError({ statusCode: 422, statusMessage: 'Não é possível transferir lançamentos de uma fatura já paga' })

  const [py, pm] = mes.split('-').map(Number)
  const prevMesY = pm === 1 ? py - 1 : py
  const prevMesM = pm === 1 ? 12 : pm - 1
  const prevMesStr = `${prevMesY}-${String(prevMesM).padStart(2, '0')}`

  // Busca o cutoff e nome do cartão origem
  const cartaoOrigem = db.prepare(`SELECT melhor_data_compra, nome FROM cartoes WHERE id = ?`).get([origemId]) as any
  const cutoff = cartaoOrigem?.melhor_data_compra ?? 1
  const nomeOrigem = cartaoOrigem?.nome ?? 'cartão anterior'
  const notaTransferencia = `Transferido de ${nomeOrigem}`

  db.transaction(() => {
    for (const lancId of lancamento_ids) {
      const t = db.prepare(`
        SELECT id, fixa, parcelas, data_inicio, data_fim, descricao, valor, categoria,
               conta_id, notas, nome_fatura, data
        FROM transacoes WHERE id = ? AND cartao_id = ? AND tipo = 'despesa'
      `).get([lancId, origemId]) as any

      if (!t) continue

      if (!t.fixa) {
        // Avulsa: transfere direto
        const novasNotas = [t.notas, notaTransferencia].filter(Boolean).join(' | ')
        db.prepare(`UPDATE transacoes SET cartao_id = ?, notas = ? WHERE id = ?`).run([destino_id, novasNotas, lancId])
        continue
      }

      // Usa o mesmo calcMes que o display: se dia >= cutoff, a ocorrência efetiva é no mês anterior
      const dayP = parseInt(t.data_inicio.slice(8, 10), 10)
      const calcMes = calcFaturaMonth(t.data_inicio, cutoff, mes, prevMesStr)

      const [iy, im] = t.data_inicio.split('-').map(Number)
      const [cy, cm] = calcMes.split('-').map(Number)
      const occIndex = (cy - iy) * 12 + (cm - im)

      if (occIndex <= 0) {
        // É a primeira ocorrência — transfere tudo direto
        const novasNotas = [t.notas, notaTransferencia].filter(Boolean).join(' | ')
        db.prepare(`UPDATE transacoes SET cartao_id = ?, notas = ? WHERE id = ?`).run([destino_id, novasNotas, lancId])
        continue
      }

      // Data da última ocorrência que fica no cartão origem
      const prevMonthDate = addMonths(t.data_inicio, occIndex - 1)
      // Data de início no cartão destino (no mês visualizado)
      const newDataInicio = effectiveDateForMonth(mes, t.data_inicio)

      const parcelasDestino = t.parcelas > 0 ? t.parcelas - occIndex : 0

      if (parcelasDestino <= 0) {
        // Última ocorrência — sem parcelas futuras, apenas muda o cartão
        const novasNotas = [t.notas, notaTransferencia].filter(Boolean).join(' | ')
        db.prepare(`UPDATE transacoes SET cartao_id = ?, notas = ? WHERE id = ?`).run([destino_id, novasNotas, lancId])
        continue
      }

      const parcelasOrigem = occIndex

      // Encurta o original no cartão origem
      db.prepare(`UPDATE transacoes SET data_fim = ?, parcelas = ? WHERE id = ?`)
        .run([prevMonthDate, parcelasOrigem, lancId])

      // Cria a continuação no cartão destino
      db.prepare(`
        INSERT INTO transacoes
          (descricao, valor, tipo, categoria, fixa, data, data_inicio, data_fim, parcelas, cartao_id, notas, nome_fatura)
        VALUES (?, ?, 'despesa', ?, 1, ?, ?, ?, ?, ?, ?, ?)
      `).run([
        t.descricao, t.valor, t.categoria,
        newDataInicio, newDataInicio,
        t.data_fim ?? null,
        parcelasDestino,
        destino_id,
        [t.notas, notaTransferencia].filter(Boolean).join(' | ') || null, t.nome_fatura ?? null,
      ])
    }
  })()

  return { success: true }
})
