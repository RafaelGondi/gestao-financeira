import { getQuery } from 'h3'
import { computeCashFlowTimeline } from '../../utils/cash-flow-timeline'
import { localDateStr } from '../../utils/localDate'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  let month = query.month as string | undefined

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    const now = new Date()
    month = localDateStr(now).slice(0, 7)
  }

  return computeCashFlowTimeline(month)
})
