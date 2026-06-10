import { findBank, findBankByName, normalizeInstituicaoName } from './banks'

export function parseInstituicaoFaixas(body: Record<string, unknown>) {
  const key = body.instituicao_key?.toString().trim() || ''
  const custom = body.instituicao_custom?.toString().trim()
    || body.grupo_rendimento?.toString().trim()
    || ''

  if (key && key !== 'outro') {
    const bank = findBank(key)
    return {
      instituicao_key: key,
      grupo_rendimento: bank?.name ?? key,
    }
  }

  if (custom) {
    const bank = findBankByName(custom)
    if (bank) {
      return {
        instituicao_key: bank.key,
        grupo_rendimento: bank.name,
      }
    }
    return {
      instituicao_key: null as string | null,
      grupo_rendimento: custom,
    }
  }

  return {
    instituicao_key: null as string | null,
    grupo_rendimento: null as string | null,
  }
}

/** Chave estável para agrupar caixinhas (key ou nome legado normalizado). */
export function resolveInstituicaoGrupoKey(item: {
  instituicao_key?: string | null
  grupo_rendimento?: string | null
}): string | null {
  const key = item.instituicao_key?.trim()
  if (key) return key

  const bank = findBankByName(item.grupo_rendimento ?? '')
  if (bank) return bank.key

  const legacy = normalizeInstituicaoName(item.grupo_rendimento ?? '')
  return legacy || null
}

export function instituicaoGrupoMatch(
  a: { instituicao_key?: string | null; grupo_rendimento?: string | null },
  b: { instituicao_key?: string | null; grupo_rendimento?: string | null },
): boolean {
  const ka = resolveInstituicaoGrupoKey(a)
  const kb = resolveInstituicaoGrupoKey(b)
  return !!ka && ka === kb
}

export function instituicaoDisplayName(
  instituicao_key: string | null | undefined,
  grupo_rendimento: string | null | undefined,
): string | null {
  const key = instituicao_key?.trim()
  if (key) return findBank(key)?.name ?? key
  return grupo_rendimento?.trim() || null
}

export interface InstituicaoPersistida {
  instituicao_key: string | null
  grupo_rendimento: string | null
}

/** Preserva dados legados ao editar item que não usa faixas ou quando o body não envia instituição. */
export function resolveInstituicaoForSave(
  body: Record<string, unknown>,
  rendimento_modo: string,
  existing?: InstituicaoPersistida | null,
): InstituicaoPersistida {
  const isFaixas = rendimento_modo === 'cdi_faixas'

  if (!isFaixas) {
    return {
      instituicao_key: existing?.instituicao_key ?? null,
      grupo_rendimento: existing?.grupo_rendimento ?? null,
    }
  }

  const parsed = parseInstituicaoFaixas(body)
  if (!parsed.instituicao_key && !parsed.grupo_rendimento && existing) {
    return {
      instituicao_key: existing.instituicao_key ?? null,
      grupo_rendimento: existing.grupo_rendimento ?? null,
    }
  }

  return parsed
}
