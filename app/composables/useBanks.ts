import { BANKS, findBank, bankLogoUrl, type Bank } from '~/utils/banks'

export type { Bank }

export function useBanks() {
  function logoUrl(domain: string): string {
    return bankLogoUrl(domain)
  }

  return { BANKS, findBank, logoUrl }
}
