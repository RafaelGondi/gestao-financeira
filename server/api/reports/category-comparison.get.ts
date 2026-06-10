import db from '../../db/index'
import { getQuery } from 'h3'
import {
  aggregateByMode,
  buildSuperMap,
  getMonthExpenseItems,
} from '../../utils/category-expenses'

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

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const now = new Date()
  const currentMonthDefault = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const prevMonthDefault = now.getMonth() === 0
    ? `${now.getFullYear() - 1}-12`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`

  const monthA = (query.month as string) || prevMonthDefault
  const monthB = (query.compareMonth as string) || currentMonthDefault
  const modo = (query.modo as string) === 'supercategoria' ? 'supercategoria' : 'categoria'

  const superMap = buildSuperMap()

  const totalsA = aggregateByMode(getMonthExpenseItems(monthA), modo, superMap)
  const totalsB = aggregateByMode(getMonthExpenseItems(monthB), modo, superMap)

  const trendEnd = monthA >= monthB ? monthA : monthB
  const trendMonths = prevMonths(trendEnd, 6)
  const trendMaps = trendMonths.map(m => aggregateByMode(getMonthExpenseItems(m), modo, superMap))

  const metaMap = modo === 'categoria'
    ? new Map((db.prepare(`SELECT nome, cor, icone FROM categorias`).all() as { nome: string; cor: string; icone: string }[]).map(c => [c.nome, c]))
    : new Map((db.prepare(`SELECT nome, cor, icone FROM supercategorias`).all() as { nome: string; cor: string; icone: string }[]).map(s => [s.nome, s]))

  const allKeys = new Set([...totalsA.keys(), ...totalsB.keys()])
  const rows = [...allKeys].map(nome => {
    const meta = metaMap.get(nome)
    const total_a = totalsA.get(nome) ?? 0
    const total_b = totalsB.get(nome) ?? 0
    const diff = total_b - total_a
    const diff_pct = total_a > 0 ? (diff / total_a) * 100 : null
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
  }).sort((a, b) => b.total_b - a.total_b || b.total_a - a.total_a)

  return {
    rows,
    total_a: rows.reduce((s, r) => s + r.total_a, 0),
    total_b: rows.reduce((s, r) => s + r.total_b, 0),
  }
})
