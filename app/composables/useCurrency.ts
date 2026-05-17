export function useCurrency() {
  const format = (value: number) => {
    const rounded = Math.round((value || 0) * 100) / 100
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rounded)
  }
  return { format }
}
