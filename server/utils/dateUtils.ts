/**
 * Retorna a data efetiva de uma transação fixa para um dado mês,
 * clampando o dia ao último dia válido do mês.
 * Ex: dia 31 em fevereiro → último dia de fevereiro.
 */
export function effectiveDate(month: string, dataInicio: string): string {
  const day = parseInt(dataInicio.slice(8, 10), 10)
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const clamped = Math.min(day, lastDay)
  return `${month}-${String(clamped).padStart(2, '0')}`
}
