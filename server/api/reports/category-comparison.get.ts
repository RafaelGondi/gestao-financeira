import db from '../../db/index'
import { getQuery } from 'h3'
import { faturaDateRange, calcFaturaMonth } from '../../utils/fatura'
import { getCartoesParaMes } from '../../utils/cartoes'

interface Item {
  valor: number
  categoria: string | null
}

// Mapeia categoria → supercategoria (nome, cor, icone)
function buildSuperMap() {
  const catRows = db.prepare(`
    SELECT c.nome, s.nome AS super_nome, s.cor AS super_cor, s.icone AS super_icone
    FROM categorias c
    LEFT JOIN supercategorias s ON s.id = c.supercategoria_id
  `).all() as { nome: string; super_nome: string | null; super_cor: string | null; super_icone: string | null }[]
  return new Map(catRows.map(r => [r.nome, {
    nome: r.super_nome ?? 'Sem supercategoria',
    cor: r.super_cor ?? '#6b7280',
    icone: r.super_icone ?? 'i-heroicons-tag',
  }]))
}

function getCategoryTotals(month: string): Map<string, number> {
  const [yearStr, monStr] = month.split('-')
  const year = Number(yearStr), mon = Number(monStr)
  const startDate = `${yearStr}-${monStr}-01`
  const lastDay = new Date(year, mon, 0).getDate()
  const endDate = `${yearStr}-${monStr}-${String(lastDay).padStart(2, '0')}`
  const prevYear = mon === 1 ? year - 1 : year
  const prevMon = mon === 1 ? 12 : mon - 1
  const prevMonStr = `${prevYear}-${String(prevMon).padStart(2, '0')}`

  const cartoes = getCartoesParaMes(month)
  const itens: Item[] = []

  // Avulsas sem cartão
  itens.push(...db.prepare(`
    SELECT t.valor, t.categoria FROM transacoes t
    WHERE t.tipo = 'despesa' AND t.fixa = 0 AND t.cartao_id IS NULL AND t.data >= ? AND t.data <= ?
  `).all([startDate, endDate]) as Item[])

  // Fixas sem cartão
  itens.push(...db.prepare(`
    SELECT t.valor, t.categoria FROM transacoes t
    WHERE t.tipo = 'despesa' AND t.fixa = 1 AND t.cartao_id IS NULL
      AND t.data_inicio <= ? AND (t.data_fim IS NULL OR t.data_fim >= ?)
  `).all([endDate, startDate]) as Item[])

  // Cartão avulsas (pelo mês de fatura)
  for (const c of cartoes) {
    const { startDate: fStart, endDate: fEnd } = faturaDateRange(year, mon, c.melhor_data_compra)
    itens.push(...db.prepare(`
      SELECT t.valor, t.categoria FROM transacoes t
      WHERE t.tipo = 'despesa' AND t.fixa = 0 AND t.cartao_id = ? AND t.data >= ? AND t.data <= ?
    `).all([c.id, fStart, fEnd]) as Item[])
  }

  // Cartão fixas/parceladas
  for (const c of cartoes) {
    const cutoff = c.melhor_data_compra
    const { startDate: fStart, endDate: fEnd } = faturaDateRange(year, mon, cutoff)
    const rows = db.prepare(`
      SELECT valor, categoria, data_inicio, data_fim FROM transacoes
      WHERE tipo = 'despesa' AND fixa = 1 AND cartao_id = ?
        AND data_inicio <= ? AND (data_fim IS NULL OR data_fim >= ?)
    `).all([c.id, fEnd, fStart]) as any[]

    for (const t of rows) {
      const dayP = parseInt(t.data_inicio.slice(8, 10), 10)
      const calcMonth = calcFaturaMonth(t.data_inicio, cutoff, month, prevMonStr)
      const effDate = effectiveDate(calcMonth, t.data_inicio)
      if (effDate < t.data_inicio) continue
      if (t.data_fim && effDate > t.data_fim) continue
      itens.push({ valor: t.valor, categoria: t.categoria })
    }
  }

  const map = new Map<string, number>()
  for (const t of itens) {
    const key = t.categoria ?? 'Sem categoria'
    map.set(key, (map.get(key) ?? 0) + t.valor)
  }
  return map
}

function prevMonths(fromMonth: string, count: number): string[] {
  const [yearStr, monStr] = fromMonth.split('-')
  let y = Number(yearStr), m = Number(monStr)
  const result: string[] = []
  for (let i = 0; i < count; i++) {
    result.unshift(`${y}-${String(m).padStart(2, '0')}`)
    m--
    if (m === 0) { m = 12; y-- }
  }
  return result
}

// Agrega um Map<categoria, valor> → Map<chave, valor> de acordo com o modo
function aggregateByMode(
  catTotals: Map<string, number>,
  modo: 'categoria' | 'supercategoria',
  superMap: ReturnType<typeof buildSuperMap>
): Map<string, number> {
  if (modo === 'categoria') return catTotals
  const out = new Map<string, number>()
  for (const [cat, val] of catTotals) {
    const superNome = superMap.get(cat)?.nome ?? 'Sem supercategoria'
    out.set(superNome, (out.get(superNome) ?? 0) + val)
  }
  return out
}

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const now = new Date()
  const currentMonthDefault = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const prevMonthDefault = now.getMonth() === 0
    ? `${now.getFullYear() - 1}-12`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`

  const monthA = (query.month as string) || currentMonthDefault
  const monthB = (query.compareMonth as string) || prevMonthDefault
  const modo = (query.modo as string) === 'supercategoria' ? 'supercategoria' : 'categoria'

  const superMap = buildSuperMap()

  const totalsA = aggregateByMode(getCategoryTotals(monthA), modo, superMap)
  const totalsB = aggregateByMode(getCategoryTotals(monthB), modo, superMap)

  // Últimos 6 meses terminando em monthA (inclusive) para sparkline
  const trendMonths = prevMonths(monthA, 6)
  const trendMaps = trendMonths.map(m => aggregateByMode(getCategoryTotals(m), modo, superMap))

  // Meta (cor/ícone) dependendo do modo
  const metaMap = modo === 'categoria'
    ? new Map((db.prepare(`SELECT nome, cor, icone FROM categorias`).all() as { nome: string; cor: string; icone: string }[]).map(c => [c.nome, c]))
    : new Map((db.prepare(`SELECT nome, cor, icone FROM supercategorias`).all() as { nome: string; cor: string; icone: string }[]).map(s => [s.nome, s]))

  const allKeys = new Set([...totalsA.keys(), ...totalsB.keys()])
  const rows = [...allKeys].map(nome => {
    const meta = metaMap.get(nome)
    const total_a = totalsA.get(nome) ?? 0
    const total_b = totalsB.get(nome) ?? 0
    const diff = total_a - total_b
    const diff_pct = total_b > 0 ? (diff / total_b) * 100 : null
    const trend = trendMaps.map(m => m.get(nome) ?? 0)
    return {
      nome,
      cor: meta?.cor ?? '#6b7280',
      icone: meta?.icone ?? 'i-heroicons-tag',
      total_a,
      total_b,
      diff,
      diff_pct,
      trend,
    }
  }).sort((a, b) => b.total_a - a.total_a || b.total_b - a.total_b)

  return {
    rows,
    total_a: rows.reduce((s, r) => s + r.total_a, 0),
    total_b: rows.reduce((s, r) => s + r.total_b, 0),
  }
})
