export interface Bank {
  key: string
  name: string
  domain: string
  color: string
  initials: string
}

export const BANKS: Bank[] = [
  { key: 'itau',        name: 'Itaú',            domain: 'itau.com.br',         color: '#EC7000', initials: 'IT' },
  { key: 'bradesco',    name: 'Bradesco',        domain: 'bradesco.com.br',     color: '#CC0000', initials: 'BR' },
  { key: 'bb',          name: 'Banco do Brasil', domain: 'bb.com.br',           color: '#FCBE00', initials: 'BB' },
  { key: 'caixa',       name: 'Caixa',           domain: 'caixa.gov.br',        color: '#005CA9', initials: 'CE' },
  { key: 'inter',       name: 'Inter',           domain: 'inter.co',            color: '#FF7A00', initials: 'IN' },
  { key: 'btg',         name: 'BTG Pactual',     domain: 'btgpactual.com',      color: '#013A6E', initials: 'BT' },
  { key: 'mercadopago', name: 'Mercado Pago',    domain: 'mercadopago.com.br',  color: '#009EE3', initials: 'MP' },
  { key: 'picpay',      name: 'PicPay',          domain: 'picpay.com',          color: '#21C25E', initials: 'PP' },
]

/** Normaliza nome para comparação (case, acentos, espaços). */
export function normalizeInstituicaoName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
}

export function findBank(key: string): Bank | undefined {
  return BANKS.find(b => b.key === key)
}

/** Resolve banco a partir de key, nome oficial ou texto legado (ex.: "Mercado Pago"). */
export function findBankByName(name: string): Bank | undefined {
  const n = normalizeInstituicaoName(name)
  if (!n) return undefined
  const byKey = BANKS.find(b => b.key === n.replace(/\s/g, ''))
  if (byKey) return byKey
  return BANKS.find(b => normalizeInstituicaoName(b.name) === n)
}

export function bankLogoUrl(domain: string): string {
  return `https://logo.clearbit.com/${domain}`
}
