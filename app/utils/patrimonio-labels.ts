export const PATRIMONIO_TIPOS = [
  { value: 'fgts', label: 'FGTS' },
  { value: 'consorcio', label: 'Consórcio' },
  { value: 'renda_fixa', label: 'Renda fixa (CDB, LCI…)' },
  { value: 'caixinha', label: 'Caixinha / poupança digital' },
  { value: 'outro', label: 'Outro' },
] as const

export function tipoLabel(tipo: string) {
  return PATRIMONIO_TIPOS.find(t => t.value === tipo)?.label ?? tipo
}

export function movDesc(
  m: { tipo: string; valor: number; transferencia_id?: number | null },
  format: (n: number) => string,
) {
  if (m.tipo === 'ajuste') return `Saldo ajustado para ${format(m.valor)}`
  if (m.tipo === 'retirada') {
    if (m.transferencia_id) return `Saque para conta · ${format(m.valor)}`
    return `Retirada · ${format(m.valor)}`
  }
  if (m.transferencia_id) return `Aporte da conta · ${format(m.valor)}`
  return `Crédito extra · ${format(m.valor)}`
}

export function fmtPatrimonioDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

export function fmtPatrimonioMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const date = new Date(y, m - 1, 1)
  const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
