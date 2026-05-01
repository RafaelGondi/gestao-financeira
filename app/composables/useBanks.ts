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

export function useBanks() {
  function findBank(key: string): Bank | undefined {
    return BANKS.find(b => b.key === key)
  }

  function logoUrl(domain: string): string {
    return `https://logo.clearbit.com/${domain}`
  }

  return { BANKS, findBank, logoUrl }
}
