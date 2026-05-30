import db from '../../../db/index'
import { getRouterParam, readBody } from 'h3'
import { effectiveDate } from '../../../utils/dateUtils'

interface Body {
  novo_melhor_data_compra: number
  novo_vencimento: number
  a_partir_de: string // YYYY-MM
  fatura_transicao?: {
    janela_inicio: string // YYYY-MM-DD
    janela_fim: string    // YYYY-MM-DD
  }
}

function calcDataFim(dataInicio: string, parcelas: number): string {
  const [y, m, d] = dataInicio.split('-').map(Number)
  const total = m - 1 + parcelas - 1
  const ny = y + Math.floor(total / 12)
  const nm = (total % 12) + 1
  const lastDay = new Date(ny, nm, 0).getDate()
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'ID inválido' })

  const cartao = db.prepare(`SELECT * FROM cartoes WHERE id = ? AND (arquivado = 0 OR arquivado IS NULL)`).get([id]) as any
  if (!cartao) throw createError({ statusCode: 404, statusMessage: 'Cartão não encontrado ou já arquivado' })

  const body = await readBody<Body>(event)
  const { novo_melhor_data_compra, novo_vencimento, a_partir_de, fatura_transicao } = body

  if (!a_partir_de || !/^\d{4}-\d{2}$/.test(a_partir_de))
    throw createError({ statusCode: 400, statusMessage: 'Mês de início inválido (use YYYY-MM)' })
  if (!novo_melhor_data_compra || novo_melhor_data_compra < 1 || novo_melhor_data_compra > 31)
    throw createError({ statusCode: 400, statusMessage: 'Melhor data de compra inválida' })
  if (!novo_vencimento || novo_vencimento < 1 || novo_vencimento > 31)
    throw createError({ statusCode: 400, statusMessage: 'Vencimento inválido' })

  const [ay, am] = a_partir_de.split('-').map(Number)

  const result = db.transaction(() => {
    // 1. Criar o clone com novos dados
    const insertResult = db.prepare(`
      INSERT INTO cartoes (nome, banco, banco_key, limite, melhor_data_compra, vencimento, cor, ordem)
      SELECT nome, banco, banco_key, limite, ?, ?, cor, ordem
      FROM cartoes WHERE id = ?
    `).run([novo_melhor_data_compra, novo_vencimento, id])
    const newId = Number(insertResult.lastInsertRowid)

    // 2. Arquivar o cartão antigo
    db.prepare(`
      UPDATE cartoes SET arquivado = 1, arquivado_a_partir_de = ?, substituido_por = ?
      WHERE id = ?
    `).run([a_partir_de, newId, id])

    // 3. Mover faturas em aberto pro novo cartão
    db.prepare(`
      UPDATE faturas SET cartao_id = ? WHERE cartao_id = ? AND pago = 0
    `).run([newId, id])

    // 4. Criar fatura de transição (se informada) com janela explícita
    if (fatura_transicao?.janela_inicio && fatura_transicao?.janela_fim) {
      db.prepare(`
        INSERT INTO faturas (cartao_id, mes, janela_inicio, janela_fim, pago)
        VALUES (?, ?, ?, ?, 0)
        ON CONFLICT(cartao_id, mes) DO UPDATE SET janela_inicio = ?, janela_fim = ?
      `).run([
        newId, a_partir_de,
        fatura_transicao.janela_inicio, fatura_transicao.janela_fim,
        fatura_transicao.janela_inicio, fatura_transicao.janela_fim,
      ])
    }

    // 5. Migrar despesas fixas ativas pro novo cartão
    const fixasAtivas = db.prepare(`
      SELECT id, descricao, valor, categoria, parcelas, data_inicio, data_fim, notas, nome_fatura
      FROM transacoes
      WHERE cartao_id = ? AND fixa = 1 AND tipo = 'despesa'
        AND (data_fim IS NULL OR data_fim >= ?)
    `).all([id, `${a_partir_de}-01`]) as any[]

    for (const fixa of fixasAtivas) {
      const [iy, im] = fixa.data_inicio.split('-').map(Number)
      const newDataInicio = effectiveDate(a_partir_de, fixa.data_inicio)

      let newParcelas = 0
      let newDataFim = fixa.data_fim ?? null

      if (fixa.parcelas > 0) {
        const occurrenceIndex = (ay - iy) * 12 + (am - im)
        const remainingParcelas = fixa.parcelas - occurrenceIndex
        if (remainingParcelas <= 0) continue // já terminou antes da transição
        newParcelas = remainingParcelas
        newDataFim = calcDataFim(newDataInicio, remainingParcelas)
      }

      db.prepare(`
        INSERT INTO transacoes
          (descricao, valor, tipo, categoria, fixa, data, data_inicio, data_fim, parcelas, cartao_id, notas, nome_fatura)
        VALUES (?, ?, 'despesa', ?, 1, ?, ?, ?, ?, ?, ?, ?)
      `).run([
        fixa.descricao, fixa.valor, fixa.categoria,
        newDataInicio, newDataInicio, newDataFim, newParcelas,
        newId, fixa.notas ?? null, fixa.nome_fatura ?? null,
      ])
    }

    return { novo_cartao_id: newId }
  })()

  return { success: true, ...result }
})
