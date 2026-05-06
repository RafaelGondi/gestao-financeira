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
      <span class="text-xs font-medium text-gray-400">{{ linhas.length }} item{{ linhas.length !== 1 ? 's' : '' }}</span>
    </div>

    <!-- Items -->
    <div class="px-5 py-3 flex-1">
      <div v-if="linhas.length === 0" class="text-center py-4 text-gray-400 text-sm">
        Nenhuma conta a pagar
      </div>
      <div
        v-for="linha in linhas"
        :key="linha.key"
        class="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0"
        :class="linha.pago ? 'line-through opacity-80' : ''"
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
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ linha.descricao }}</p>
            <p class="text-xs text-gray-400">{{ linha.subtitulo }}</p>
          </div>
        </div>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ format(linha.valor) }}</span>
      </div>
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
}

interface Linha {
  key: string
  descricao: string
  subtitulo: string
  sortDate: string
  valor: number
  pago: boolean
  cartaoId: number | null
  cartaoData: Cartao | null
  categoria_icone?: string | null
  categoria_cor?: string | null
}

const props = defineProps<{ total: number; items: Item[]; cartoes?: Cartao[]; month?: string }>()

const { format } = useCurrency()
const { findBank } = useBanks()

function miniCardStyle(cartao: Cartao) {
  const color = cartao.cor ?? findBank(cartao.banco_key)?.color ?? '#6366f1'
  return { background: `linear-gradient(135deg, ${color}ee 0%, ${color}99 100%)` }
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
    resultado.push({
      key: `cartao-${cartaoId}`,
      descricao: `Fatura ${cartao?.nome ?? 'Cartão'}`,
      subtitulo,
      sortDate: vencDate,
      valor,
      pago,
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
        cartaoId: null,
        cartaoData: null,
        categoria_icone: item.categoria_icone,
        categoria_cor: item.categoria_cor,
      })
    }
  }

  return resultado.sort((a, b) => b.sortDate.localeCompare(a.sortDate))
})
</script>
