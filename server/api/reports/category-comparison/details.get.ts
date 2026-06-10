import { getQuery } from 'h3'
import {
  filterItemsByGroup,
  buildSuperMap,
  getMonthExpenseItems,
} from '../../../utils/category-expenses'

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
  const nome = (query.nome as string) || ''

  if (!nome) {
    throw createError({ statusCode: 400, statusMessage: 'Nome da categoria é obrigatório' })
  }

  const superMap = buildSuperMap()
  const itens_a = filterItemsByGroup(getMonthExpenseItems(monthA), nome, modo, superMap)
  const itens_b = filterItemsByGroup(getMonthExpenseItems(monthB), nome, modo, superMap)

  return { itens_a, itens_b }
})
