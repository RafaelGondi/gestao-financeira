/**
 * Returns the current date (or a given Date) as YYYY-MM-DD using the local
 * timezone, NOT UTC. This avoids the bug where `toISOString()` flips to the
 * next day for users in UTC-N timezones when it's late at night.
 */
export function useLocalDate() {
  function localDateStr(date: Date = new Date()): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  function localTomorrow(): string {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return localDateStr(d)
  }

  return { localDateStr, localTomorrow }
}
