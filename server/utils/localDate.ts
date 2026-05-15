/**
 * Returns today's date as YYYY-MM-DD in Brazil time (America/Sao_Paulo),
 * regardless of the server OS timezone.
 */
export function localDateStr(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date)
}
