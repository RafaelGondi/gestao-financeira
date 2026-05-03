import db from '../../db/index'
import { getQuery } from 'h3'
import { faturaDateRange } from '../../utils/fatura'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  let month = query.month as string | undefined
  const modo = (query.modo as string) === 'supercategoria' ? 'supercategoria' : 'categoria'

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    const now = new Date()
    month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const [yearStr, monStr] = month.split('-')
  const year = Number(yearStr), mon = Number(monStr)
  const startDate = `${yearStr}-${monStr}-01`
  const lastDay = new Date(year, mon, 0).getDate()
  const endDate = `${yearStr}-${monStr}-${String(lastDay).padStart(2, '0')}`
  const prevYear = mon === 1 ? year - 1 : year
  const prevMon = mon === 1 ? 12 : mon - 1
  const prevMonStr = `${prevYear}-${String(prevMon).padStart(2, '0')}`

  const cartoes = db.prepare(`SELECT id, nome, melhor_data_compra FROM cartoes`).all() as { id: number; nome: string; melhor_data_compra: number }[]

  interface Item {
    id: number
    valor: number
    categoria: string | null
  }

  const itens: Item[] = []

  const avulsas = db.prepare(`
    SELECT t.id, t.valor, t.categoria
    FROM transacoes t
    WHERE t.tipo = 'despesa' AND t.fixa = 0 AND t.cartao_id IS NULL AND t.data >= ? AND t.data <= ?
  `).all([startDate, endDate]) as Item[]
  itens.push(...avulsas)

  const fixas = db.prepare(`
    SELECT t.id, t.valor, t.categoria
    FROM transacoes t
    WHERE t.tipo = 'despesa' AND t.fixa = 1 AND t.cartao_id IS NULL
      AND t.data_inicio <= ? AND (t.data_fim IS NULL OR t.data_fim >= ?)
  `).all([endDate, startDate]) as Item[]
  itens.push(...fixas)

  for (const c of cartoes) {
    const { startDate: fStart, endDate: fEnd } = faturaDateRange(year, mon, c.melhor_data_compra)
    const rows = db.prepare(`
      SELECT t.id, t.valor, t.categoria
      FROM transacoes t
      WHERE t.tipo = 'despesa' AND t.fixa = 0 AND t.cartao_id = ? AND t.data >= ? AND t.data <= ?
    `).all([c.id, fStart, fEnd]) as Item[]
    itens.push(...rows)
  }

  for (const c of cartoes) {
    const cutoff = c.melhor_data_compra
    const rows = db.prepare(`
      SELECT id, valor, categoria, data_inicio, data_fim
      FROM transacoes
      WHERE tipo = 'despesa' AND fixa = 1 AND cartao_id = ?
        AND data_inicio <= ? AND (data_fim IS NULL OR data_fim >= ?)
    `).all([c.id, endDate, startDate]) as any[]

    for (const t of rows) {
      const dayP = parseInt(t.data_inicio.slice(8, 10), 10)
      const calcMonth = cutoff > 1 && dayP >= cutoff ? prevMonStr : month
      const effectiveDate = calcMonth + '-' + t.data_inicio.slice(8, 10)
      if (effectiveDate < t.data_inicio) continue
      if (t.data_fim && effectiveDate > t.data_fim) continue
      itens.push({ id: t.id, valor: t.valor, categoria: t.categoria })
    }
  }

  const catMetaMap = new Map(
    (db.prepare(`SELECT nome, cor, icone, supercategoria_id FROM categorias`).all() as { nome: string; cor: string; icone: string; supercategoria_id: number | null }[])
      .map(c => [c.nome, c])
  )

  const superMetaMap = new Map(
    (db.prepare(`SELECT id, nome, cor, icone FROM supercategorias`).all() as { id: number; nome: string; cor: string; icone: string }[])
      .map(s => [s.id, s])
  )

  const limitesRows = db.prepare(`SELECT id, referencia, valor FROM limites WHERE tipo = ? AND mes = ?`).all([modo, month]) as { id: number; referencia: string; valor: number }[]
  const limitesMap = new Map(limitesRows.map(l => [l.referencia, { id: l.id, valor: l.valor }]))

  const totalGasto = itens.reduce((s, t) => s + t.valor, 0)

  if (modo === 'categoria') {
    const allCats = db.prepare(`SELECT nome, cor, icone FROM categorias WHERE tipo = 'despesa'`).all() as { nome: string; cor: string; icone: string }[]

    const gastoMap = new Map<string, number>()
    for (const t of itens) {
      const key = t.categoria ?? 'Sem categoria'
      gastoMap.set(key, (gastoMap.get(key) ?? 0) + t.valor)
    }

    const seen = new Set<string>()
    const itensList: { referencia: string; cor: string; icone: string; gasto: number; limite: number | null; limiteId: number | null }[] = []

    for (const cat of allCats) {
      seen.add(cat.nome)
      const gasto = gastoMap.get(cat.nome) ?? 0
      const lim = limitesMap.get(cat.nome) ?? null
      itensList.push({ referencia: cat.nome, cor: cat.cor, icone: cat.icone, gasto, limite: lim?.valor ?? null, limiteId: lim?.id ?? null })
    }

    for (const [nome, gasto] of gastoMap) {
      if (!seen.has(nome)) {
        const lim = limitesMap.get(nome) ?? null
        itensList.push({ referencia: nome, cor: '#6b7280', icone: 'i-heroicons-tag', gasto, limite: lim?.valor ?? null, limiteId: lim?.id ?? null })
      }
    }

    itensList.sort((a, b) => {
      const aHas = a.limite !== null ? 1 : 0
      const bHas = b.limite !== null ? 1 : 0
      if (aHas !== bHas) return bHas - aHas
      return b.gasto - a.gasto
    })

    const limitedItens = itensList.filter(i => i.limite !== null)
    const totalLimitado = limitedItens.reduce((s, i) => s + (i.limite ?? 0), 0)
    const totalGastoLimitado = limitedItens.reduce((s, i) => s + i.gasto, 0)

    return { totalGasto, totalLimitado, totalGastoLimitado, itens: itensList }
  } else {
    const allSupers = db.prepare(`SELECT id, nome, cor, icone FROM supercategorias`).all() as { id: number; nome: string; cor: string; icone: string }[]

    const gastoMap = new Map<string, number>()
    for (const t of itens) {
      const catMeta = t.categoria ? catMetaMap.get(t.categoria) : null
      const superId = catMeta?.supercategoria_id ?? null
      const superMeta = superId ? superMetaMap.get(superId) : null
      const key = superMeta?.nome ?? 'Sem supercategoria'
      gastoMap.set(key, (gastoMap.get(key) ?? 0) + t.valor)
    }

    const seen = new Set<string>()
    const itensList: { referencia: string; cor: string; icone: string; gasto: number; limite: number | null; limiteId: number | null }[] = []

    for (const s of allSupers) {
      seen.add(s.nome)
      const gasto = gastoMap.get(s.nome) ?? 0
      const lim = limitesMap.get(s.nome) ?? null
      itensList.push({ referencia: s.nome, cor: s.cor, icone: s.icone, gasto, limite: lim?.valor ?? null, limiteId: lim?.id ?? null })
    }

    for (const [nome, gasto] of gastoMap) {
      if (!seen.has(nome)) {
        const lim = limitesMap.get(nome) ?? null
        itensList.push({ referencia: nome, cor: '#6b7280', icone: 'i-heroicons-tag', gasto, limite: lim?.valor ?? null, limiteId: lim?.id ?? null })
      }
    }

    itensList.sort((a, b) => {
      const aHas = a.limite !== null ? 1 : 0
      const bHas = b.limite !== null ? 1 : 0
      if (aHas !== bHas) return bHas - aHas
      return b.gasto - a.gasto
    })

    const limitedItens = itensList.filter(i => i.limite !== null)
    const totalLimitado = limitedItens.reduce((s, i) => s + (i.limite ?? 0), 0)
    const totalGastoLimitado = limitedItens.reduce((s, i) => s + i.gasto, 0)

    return { totalGasto, totalLimitado, totalGastoLimitado, itens: itensList }
  }
})
