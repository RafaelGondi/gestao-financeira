import { localDateStr } from './localDate'

type AvulsaRow = { pago?: number; despago?: number; data: string }
type FixaRow = { nao_pago?: number | null; data_pagamento?: string | null }

/** Receita avulsa liquidada — entra no saldo real da conta. */
export function isReceitaAvulsaRecebida(t: AvulsaRow, today: string = localDateStr()): boolean {
  if (t.despago) return false
  return t.pago === 1 || t.data <= today
}

/** Despesa avulsa liquidada — entra no saldo real da conta. */
export function isDespesaAvulsaPaga(t: AvulsaRow, today: string = localDateStr()): boolean {
  if (t.despago) return false
  return t.pago === 1 || t.data <= today
}

/** Ocorrência fixa (receita ou despesa) liquidada no mês. */
export function isFixaLiquidada(t: FixaRow, scheduled: string, today: string = localDateStr()): boolean {
  if (t.nao_pago) return false
  return t.data_pagamento != null || scheduled <= today
}

/** Evento conta como realizado no fluxo de caixa (impactou ou deveria ter impactado o saldo). */
export function isEventoRealizado(liquidado: boolean, eventDate: string, today: string = localDateStr()): boolean {
  return liquidado && eventDate <= today
}

/** Data de exibição: liquidação real quando pago, senão vencimento previsto. */
export function resolveEventDate(
  scheduled: string,
  dataPagamento: string | null,
  isPaid: boolean,
  today: string = localDateStr(),
): { date: string; realizado: boolean } {
  if (isPaid && dataPagamento) {
    return { date: dataPagamento, realizado: dataPagamento <= today }
  }
  return { date: scheduled, realizado: scheduled <= today }
}

/** Ocorrência fixa entra no mês visualizado pela data de caixa ou vencimento. */
export function resolveFixaForViewingMonth(
  scheduled: string,
  dataPagamento: string | null,
  liquidado: boolean,
  monthStart: string,
  monthEnd: string,
  today: string = localDateStr(),
): { include: boolean; date: string } {
  const { date } = resolveEventDate(scheduled, dataPagamento, liquidado, today)
  return { include: date >= monthStart && date <= monthEnd, date }
}
