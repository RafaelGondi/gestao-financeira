<template>
  <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <UIcon name="i-heroicons-arrow-up-circle" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
        <h3 class="font-semibold text-gray-800 dark:text-gray-100">Contas a Pagar</h3>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
          @click="sortAsc = !sortAsc"
        >
          <UIcon :name="sortAsc ? 'i-heroicons-bars-arrow-up' : 'i-heroicons-bars-arrow-down'" class="w-3.5 h-3.5" />
          {{ sortAsc ? 'mais antigo' : 'mais recente' }}
        </button>
        <span class="text-xs font-medium text-gray-400">{{ linhas.length }} item{{ linhas.length !== 1 ? 's' : '' }}</span>
      </div>
    </div>

    <!-- Items -->
    <div class="px-5 py-3 flex-1">
      <div v-if="linhas.length === 0" class="text-center py-4 text-gray-400 text-sm">
        Nenhuma conta a pagar
      </div>

      <template v-for="grupo in grupos" :key="grupo.label">
        <!-- Linhas do grupo -->
        <div
          v-for="linha in grupo.linhas"
          :key="linha.key"
          class="flex items-center justify-between py-2.5 border-b -mx-5 px-5 transition-colors"
          :class="[
            linha.pago ? 'line-through opacity-60' : '',
            linha.venceHoje && !linha.pago
              ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-900/10'
              : linha.venceAmanha && !linha.pago
                ? 'border-gray-100 dark:border-gray-800 bg-orange-50/20 dark:bg-orange-900/10'
                : 'border-gray-100 dark:border-gray-800'
          ]"
        >
          <div class="flex items-center gap-2.5">
            <!-- Card item: mini visual com cor + logo -->
            <NuxtLink
              v-if="linha.cartaoData"
              :to="`/cartoes/${linha.cartaoId}`"
              class="w-9 h-6 rounded flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity"
              :style="miniCardStyle(linha.cartaoData)"
            >
              <SharedBankLogo :bank="findBank(linha.cartaoData.banco_key)" :size="18" />
            </NuxtLink>
            <!-- Item sem cartão: ícone de categoria -->
            <div
              v-else
              class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              :style="linha.categoria_icone && linha.categoria_cor ? { background: linha.categoria_cor } : {}"
              :class="!linha.categoria_icone ? 'bg-gray-100 dark:bg-gray-800' : ''"
            >
              <UIcon
                :name="linha.categoria_icone ?? 'i-heroicons-clock'"
                class="w-4 h-4"
                :class="linha.categoria_icone ? 'text-white' : 'text-gray-400'"
              />
            </div>

            <div>
              <div class="flex items-center gap-1.5">
                <p
                  class="text-sm font-medium"
                  :class="linha.venceHoje && !linha.pago
                    ? 'text-amber-800 dark:text-amber-400'
                    : linha.venceAmanha && !linha.pago
                      ? 'text-orange-800 dark:text-orange-400'
                      : 'text-gray-700 dark:text-gray-300'"
                >
                  {{ linha.descricao }}
                </p>
                <span
                  v-if="linha.venceHoje && !linha.pago"
                  class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-300 leading-none"
                >
                  hoje
                </span>
                <span
                  v-else-if="linha.venceAmanha && !linha.pago"
                  class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-200 dark:bg-orange-800/50 text-orange-800 dark:text-orange-300 leading-none"
                >
                  amanhã
                </span>
              </div>
              <p class="text-xs text-gray-400">{{ linha.subtitulo }}</p>
            </div>
          </div>
          <span
            class="text-sm font-medium"
            :class="linha.venceHoje && !linha.pago
              ? 'text-amber-800 dark:text-amber-400'
              : linha.venceAmanha && !linha.pago
                ? 'text-orange-800 dark:text-orange-400'
                : 'text-gray-700 dark:text-gray-300'"
          >
            {{ format(linha.valor) }}
          </span>
        </div>

        <!-- Subtotal do grupo (só quando há mais de um grupo) -->
        <div v-if="grupos.length > 1" class="-mx-5 px-5 py-1.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30">
          <span class="text-[11px] text-gray-400 dark:text-gray-500">{{ grupo.label }}</span>
          <span class="text-[11px] font-medium text-gray-400 dark:text-gray-500">{{ format(grupo.subtotal) }}</span>
        </div>
      </template>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800">
      <span class="text-sm text-gray-500">Total</span>
      <span class="text-base font-semibold text-red-800 dark:text-red-400">{{ format(total) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Item {
  id: number | string
  descricao: string
  valor: number
  data: string
  cartao_id: number | null
  pago?: number
  fixa?: number
  categoria_icone?: string | null
  categoria_cor?: string | null
}

interface Cartao {
  id: number
  nome: string
  banco: string
  banco_key: string
  cor: string | null
  vencimento: number
  fatura?: number
}

interface Linha {
  key: string
  descricao: string
  subtitulo: string
  sortDate: string
  valor: number
  pago: boolean
  venceHoje: boolean
  venceAmanha: boolean
  cartaoId: number | null
  cartaoData: Cartao | null
  categoria_icone?: string | null
  categoria_cor?: string | null
}

interface Grupo {
  label: string
  linhas: Linha[]
  subtotal: number
}

const props = defineProps<{ total: number; items: Item[]; cartoes?: Cartao[]; month?: string }>()

const { format } = useCurrency()
const { findBank } = useBanks()

const sortAsc = ref(true)

const { localDateStr, localTomorrow } = useLocalDate()
const today = localDateStr()
const tomorrow = localTomorrow()

function miniCardStyle(cartao: Cartao) {
  const color = cartao.cor ?? findBank(cartao.banco_key)?.color ?? '#6366f1'
  return { background: `linear-gradient(135deg, ${color}f5 0%, ${color}dd 100%)` }
}

const linhas = computed<Linha[]>(() => {
  const resultado: Linha[] = []

  const porCartao = new Map<number, { valor: number; pago: boolean }>()
  for (const item of props.items) {
    if (item.cartao_id != null) {
      const cur = porCartao.get(item.cartao_id)
      porCartao.set(item.cartao_id, {
        valor: (cur?.valor ?? 0) + item.valor,
        pago: cur === undefined ? !!item.pago : (cur.pago && !!item.pago),
      })
    }
  }

  const [mYear, mMon] = (props.month ?? '').split('-')

  for (const [cartaoId, { valor, pago }] of porCartao.entries()) {
    const cartao = props.cartoes?.find(c => c.id === cartaoId) ?? null
    const vencDia = cartao?.vencimento
    const vencDate = vencDia && mYear && mMon
      ? `${mYear}-${mMon}-${String(vencDia).padStart(2, '0')}`
      : ''
    const subtitulo = vencDate
      ? `Vence ${new Date(vencDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
      : ''
    // Prefer cartao.fatura (already has extornos subtracted); fall back to summed items
    const faturaValor = cartao?.fatura !== undefined ? cartao.fatura : valor
    resultado.push({
      key: `cartao-${cartaoId}`,
      descricao: `Fatura ${cartao?.nome ?? 'Cartão'}`,
      subtitulo,
      sortDate: vencDate,
      valor: faturaValor,
      pago,
      venceHoje: vencDate === today,
      venceAmanha: vencDate === tomorrow,
      cartaoId,
      cartaoData: cartao,
    })
  }

  for (const item of props.items) {
    if (item.cartao_id == null) {
      resultado.push({
        key: String(item.id),
        descricao: item.descricao,
        subtitulo: new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR'),
        sortDate: item.data,
        valor: item.valor,
        pago: !!item.pago,
        venceHoje: item.data === today,
        venceAmanha: item.data === tomorrow,
        cartaoId: null,
        cartaoData: null,
        categoria_icone: item.categoria_icone,
        categoria_cor: item.categoria_cor,
      })
    }
  }

  return resultado.sort((a, b) =>
    sortAsc.value ? a.sortDate.localeCompare(b.sortDate) : b.sortDate.localeCompare(a.sortDate)
  )
})

const grupos = computed<Grupo[]>(() => {
  const result: Grupo[] = []

  const pagos    = linhas.value.filter(l => l.pago)
  const hoje     = linhas.value.filter(l => !l.pago && l.venceHoje)
  const amanha   = linhas.value.filter(l => !l.pago && l.venceAmanha)
  const proximos = linhas.value.filter(l => !l.pago && !l.venceHoje && !l.venceAmanha)

  const soma = (ls: Linha[]) => ls.reduce((s, l) => s + l.valor, 0)

  if (pagos.length)    result.push({ label: 'pagos',   linhas: pagos,    subtotal: soma(pagos) })
  if (hoje.length)     result.push({ label: 'hoje',    linhas: hoje,     subtotal: soma(hoje) })
  if (amanha.length)   result.push({ label: 'amanhã',  linhas: amanha,   subtotal: soma(amanha) })
  if (proximos.length) result.push({ label: 'a pagar', linhas: proximos, subtotal: soma(proximos) })

  return sortAsc.value ? result : result.reverse()
})
</script>
