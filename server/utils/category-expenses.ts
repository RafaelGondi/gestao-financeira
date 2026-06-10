import db from '../db/index'
import { faturaDateRange, calcFaturaMonth } from './fatura'
import { getCartoesParaMes } from './cartoes'
import { effectiveDate } from './dateUtils'

export interface ExpenseItem {
  id: number
  descricao: string
  valor: number
  data: string
  categoria: string | null
  origem: string
  fixa: boolean
}

export function buildSuperMap() {
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

/** Despesas do mês (mesma lógica do relatório por categoria). */
export function getMonthExpenseItems(month: string): ExpenseItem[] {
  const [yearStr, monStr] = month.split('-')
  const year = Number(yearStr), mon = Number(monStr)
  const startDate = `${yearStr}-${monStr}-01`
  const lastDay = new Date(year, mon, 0).getDate()
  const endDate = `${yearStr}-${monStr}-${String(lastDay).padStart(2, '0')}`
  const prevYear = mon === 1 ? year - 1 : year
  const prevMon = mon === 1 ? 12 : mon - 1
  const prevMonStr = `${prevYear}-${String(prevMon).padStart(2, '0')}`

  const cartoes = getCartoesParaMes(month)
  const itens: ExpenseItem[] = []

  const avulsas = db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.data, t.categoria,
      COALESCE(c.nome, 'Sem conta') AS origem
    FROM transacoes t
    LEFT JOIN contas c ON c.id = t.conta_id
    WHERE t.tipo = 'despesa' AND t.fixa = 0 AND t.cartao_id IS NULL AND t.data >= ? AND t.data <= ?
  `).all([startDate, endDate]) as Omit<ExpenseItem, 'fixa'>[]
  itens.push(...avulsas.map(t => ({ ...t, fixa: false })))

  const fixasRaw = db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.data_inicio, t.categoria,
      COALESCE(c.nome, 'Fixo') AS origem
    FROM transacoes t
    LEFT JOIN contas c ON c.id = t.conta_id
    WHERE t.tipo = 'despesa' AND t.fixa = 1 AND t.cartao_id IS NULL
      AND t.data_inicio <= ? AND (t.data_fim IS NULL OR t.data_fim >= ?)
  `).all([endDate, startDate]) as any[]
  for (const t of fixasRaw) {
    itens.push({
      id: t.id,
      descricao: t.descricao,
      valor: t.valor,
      data: effectiveDate(month, t.data_inicio),
      categoria: t.categoria,
      origem: t.origem,
      fixa: true,
    })
  }

  for (const c of cartoes) {
    const { startDate: fStart, endDate: fEnd } = faturaDateRange(year, mon, c.melhor_data_compra)
    const rows = db.prepare(`
      SELECT t.id, t.descricao, t.valor, t.data, t.categoria
      FROM transacoes t
      WHERE t.tipo = 'despesa' AND t.fixa = 0 AND t.cartao_id = ? AND t.data >= ? AND t.data <= ?
    `).all([c.id, fStart, fEnd]) as any[]
    itens.push(...rows.map((t: any) => ({ ...t, origem: c.nome, fixa: false })))
  }

  for (const c of cartoes) {
    const cutoff = c.melhor_data_compra
    const { startDate: fStart, endDate: fEnd } = faturaDateRange(year, mon, cutoff)
    const rows = db.prepare(`
      SELECT id, descricao, valor, categoria, data_inicio, data_fim
      FROM transacoes
      WHERE tipo = 'despesa' AND fixa = 1 AND cartao_id = ?
        AND data_inicio <= ? AND (data_fim IS NULL OR data_fim >= ?)
    `).all([c.id, fEnd, fStart]) as any[]

    for (const t of rows) {
      const calcMonth = calcFaturaMonth(t.data_inicio, cutoff, month, prevMonStr)
      const effDate = effectiveDate(calcMonth, t.data_inicio)
      if (effDate < t.data_inicio) continue
      if (t.data_fim && effDate > t.data_fim) continue
      itens.push({
        id: t.id,
        descricao: t.descricao,
        valor: t.valor,
        data: effDate,
        categoria: t.categoria,
        origem: c.nome,
        fixa: true,
      })
    }
  }

  return itens.sort((a, b) => b.data.localeCompare(a.data) || b.valor - a.valor)
}

export function groupKeyForItem(
  item: ExpenseItem,
  modo: 'categoria' | 'supercategoria',
  superMap: ReturnType<typeof buildSuperMap>,
): string {
  const cat = item.categoria ?? 'Sem categoria'
  if (modo === 'categoria') return cat
  return superMap.get(cat)?.nome ?? 'Sem supercategoria'
}

export function aggregateByMode(
  items: ExpenseItem[],
  modo: 'categoria' | 'supercategoria',
  superMap: ReturnType<typeof buildSuperMap>,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const item of items) {
    const key = groupKeyForItem(item, modo, superMap)
    map.set(key, (map.get(key) ?? 0) + item.valor)
  }
  return map
}

export function filterItemsByGroup(
  items: ExpenseItem[],
  nome: string,
  modo: 'categoria' | 'supercategoria',
  superMap: ReturnType<typeof buildSuperMap>,
): ExpenseItem[] {
  return items.filter(item => groupKeyForItem(item, modo, superMap) === nome)
}
