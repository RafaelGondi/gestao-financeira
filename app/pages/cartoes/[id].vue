<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <UButton icon="i-heroicons-arrow-left" variant="ghost" color="neutral" to="/cartoes" />
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ data?.cartao.nome }}</h1>
        <p class="text-sm text-gray-500 mt-0.5">{{ data?.cartao.banco }} · Vence dia {{ data?.cartao.vencimento }}</p>
      </div>
    </div>

    <!-- Card visual -->
    <div v-if="data" class="h-32 rounded-2xl p-5 relative" :style="cardStyle">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-white/70 text-xs font-medium">{{ data.cartao.banco }}</p>
          <p class="text-white text-xl font-bold mt-0.5">{{ data.cartao.nome }}</p>
        </div>
        <SharedBankLogo :bank="findBank(data.cartao.banco_key)" :size="40" class="rounded-lg opacity-90" />
      </div>
      <div class="absolute bottom-5 left-5 right-5 flex justify-between items-end">
        <div>
          <p class="text-white/60 text-xs">Limite</p>
          <p class="text-white text-sm font-semibold">{{ format(data.cartao.limite) }}</p>
        </div>
        <div class="text-right">
          <p class="text-white/60 text-xs">Melhor compra</p>
          <p class="text-white text-sm font-semibold">Dia {{ data.cartao.melhor_data_compra }}</p>
        </div>
      </div>
    </div>

    <!-- Month navigator -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl px-6 py-4 shadow-sm border border-gray-100 dark:border-gray-800">
      <DashboardMonthNavigator v-model="currentMonth" />
    </div>

    <!-- Resumo -->
    <div v-if="data" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard class="border-0 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-credit-card" class="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p class="text-xs text-gray-500">Fatura do mês</p>
            <p class="text-lg font-bold text-gray-900 dark:text-white">{{ format(data.cartao.gasto_mes) }}</p>
          </div>
        </div>
      </UCard>

      <UCard class="border-0 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-banknotes" class="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p class="text-xs text-gray-500">Disponível</p>
            <p class="text-lg font-bold text-green-600 dark:text-green-400">{{ format(disponivel) }}</p>
          </div>
        </div>
      </UCard>

      <UCard class="border-0 shadow-sm">
        <div class="space-y-2">
          <div class="flex justify-between text-xs text-gray-500">
            <span>Limite comprometido</span>
            <span :class="usoPct >= 90 ? 'text-red-500 font-medium' : usoPct >= 70 ? 'text-yellow-500 font-medium' : ''">
              {{ usoPct.toFixed(0) }}%
            </span>
          </div>
          <div class="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
            <div
              class="h-2 rounded-full transition-all"
              :class="usoPct >= 90 ? 'bg-red-500' : usoPct >= 70 ? 'bg-yellow-400' : 'bg-green-500'"
              :style="{ width: Math.min(usoPct, 100) + '%' }"
            />
          </div>
          <div class="flex justify-between text-xs text-gray-400">
            <span>{{ format(data.cartao.gasto_total) }}</span>
            <span>{{ format(data.cartao.limite) }}</span>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="space-y-3">
      <USkeleton v-for="i in 4" :key="i" class="h-16 rounded-xl" />
    </div>

    <!-- Error -->
    <UAlert v-else-if="error" color="red" variant="soft" title="Erro ao carregar lançamentos"
      :description="error.message" icon="i-heroicons-exclamation-triangle" />

    <!-- Empty -->
    <div v-else-if="!data?.lancamentos.length" class="text-center py-20">
      <div class="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
        <UIcon name="i-heroicons-credit-card" class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Nenhum lançamento neste mês</h3>
      <p class="text-gray-400 text-sm mb-6">Adicione despesas vinculadas a este cartão</p>
      <UButton icon="i-heroicons-plus" color="primary" to="/despesas">
        Ir para Despesas
      </UButton>
    </div>

    <!-- Lista -->
    <div v-else class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div
        v-for="(lanc, i) in data.lancamentos"
        :key="`${lanc.id}-${lanc.fixa}`"
        class="flex items-center gap-4 px-5 py-4"
        :class="i < data.lancamentos.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''"
      >
        <!-- Ícone -->
        <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" :class="iconBg(lanc)">
          <UIcon :name="iconName(lanc)" class="w-5 h-5" :class="iconColor(lanc)" />
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="font-medium text-gray-900 dark:text-white truncate">{{ lanc.descricao }}</p>
            <UBadge v-if="lanc.parcelas > 0" :label="`${lanc.parcela_atual}/${lanc.parcelas}`" color="purple" variant="soft" size="xs"
              icon="i-heroicons-queue-list" />
            <UBadge v-else-if="lanc.fixa" label="Fixa" color="info" variant="soft" size="xs"
              icon="i-heroicons-arrow-path" />
          </div>
          <div class="flex items-center gap-2 mt-0.5 flex-wrap">
            <span class="text-xs text-gray-400">{{ descricaoData(lanc) }}</span>
            <span v-if="lanc.categoria"
              class="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
              {{ lanc.categoria }}
            </span>
          </div>
        </div>

        <!-- Valor e status -->
        <div class="flex items-center gap-3 flex-shrink-0">
          <p class="text-base font-semibold text-red-600 dark:text-red-400">
            - {{ format(lanc.valor) }}
          </p>
          <UBadge :label="lanc.pago === 1 ? 'Pago' : 'A pagar'" :color="lanc.pago === 1 ? 'success' : 'warning'" variant="soft" size="sm" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Lancamento {
  id: number
  descricao: string
  valor: number
  data: string
  data_inicio: string | null
  data_fim: string | null
  categoria: string | null
  fixa: number
  parcelas: number
  parcela_atual: number | null
  pago: number
}

interface CartaoDetalhe {
  id: number
  nome: string
  banco: string
  banco_key: string
  limite: number
  melhor_data_compra: number
  vencimento: number
  gasto_mes: number
  gasto_total: number
}

const route = useRoute()
const { format } = useCurrency()
const { findBank } = useBanks()

const now = new Date()
const currentMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

const { data, pending, error } = await useFetch<{ cartao: CartaoDetalhe; lancamentos: Lancamento[] }>(
  `/api/cartoes/${route.params.id}/lancamentos`,
  {
    query: computed(() => ({ month: currentMonth.value })),
    watch: [currentMonth]
  }
)

const cardStyle = computed(() => {
  const bank = findBank(data.value?.cartao.banco_key ?? '')
  const color = bank?.color ?? '#6366f1'
  return { background: `linear-gradient(135deg, ${color}dd 0%, ${color}88 100%)` }
})

const disponivel = computed(() => (data.value?.cartao.limite ?? 0) - (data.value?.cartao.gasto_total ?? 0))
const usoPct = computed(() => {
  const limite = data.value?.cartao.limite
  if (!limite) return 0
  return ((data.value?.cartao.gasto_total ?? 0) / limite) * 100
})

function fmtDate(d: string | null) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function descricaoData(l: Lancamento) {
  if (l.fixa) {
    const dia = l.data_inicio?.split('-')[2]
    return `Todo dia ${dia}${l.data_fim ? ' · até ' + fmtDate(l.data_fim) : ''}`
  }
  return fmtDate(l.data)
}

function iconName(l: Lancamento) {
  if (l.fixa) return l.pago === 1 ? 'i-heroicons-check-circle' : 'i-heroicons-arrow-path'
  return l.pago === 1 ? 'i-heroicons-check-circle' : 'i-heroicons-clock'
}

function iconBg(l: Lancamento) {
  return l.pago === 1
    ? 'bg-green-100 dark:bg-green-900/30'
    : l.fixa
      ? 'bg-blue-100 dark:bg-blue-900/30'
      : 'bg-yellow-100 dark:bg-yellow-900/30'
}

function iconColor(l: Lancamento) {
  return l.pago === 1
    ? 'text-green-600 dark:text-green-400'
    : l.fixa
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-yellow-600 dark:text-yellow-400'
}

useHead({ title: computed(() => `${data.value?.cartao.nome ?? 'Cartão'} — Gestão Financeira`) })
</script>
