export function useCurrency() {
  const format = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  return { format }
}
