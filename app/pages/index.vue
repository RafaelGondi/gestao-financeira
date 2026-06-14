<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p class="text-sm text-gray-500 mt-1">Visão geral das suas finanças</p>
      </div>
      <button
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer"
        :class="globalHidden
          ? 'border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
          : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'"
        @click="globalHidden = !globalHidden"
      >
        <UIcon :name="globalHidden ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="w-4 h-4" />
        {{ globalHidden ? 'Exibir valores' : 'Ocultar valores' }}
      </button>
    </div>

    <!-- Month Navigator -->
    <div class="bg-white dark:bg-gray-900 rounded-lg px-6 py-4 border border-gray-100 dark:border-gray-800">
      <DashboardMonthNavigator v-model="currentMonth" />
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <USkeleton v-for="i in 4" :key="i" class="h-52 rounded-lg" />
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      color="red"
      variant="soft"
      title="Erro ao carregar dados"
      :description="error.message"
      icon="i-heroicons-exclamation-triangle"
    />

    <!-- Dashboard Content -->
    <template v-else-if="data">
      <!-- 4 Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <DashboardResumoCard
          title="Saldo do Período Anterior"
          :value="data.saldoAnterior"
          value-color="blue"
          icon="i-heroicons-arrow-trending-up"
          :period="prevMonthEndLabel"
          subtitle2="(Receita - Despesa + Saldo)"
          show-eye
          :hidden="globalHidden"
          :sub1="{ label: 'Pendências', value: 0, color: 'orange' }"
          :sub2="{ label: 'Disponível', value: data.saldoAnterior, color: 'green' }"
        />
        <DashboardResumoCard
          title="Receitas"
          :value="data.receitas.total"
          value-color="green"
          icon="i-heroicons-arrow-trending-up"
          :period="periodLabel"
          show-eye
          :hidden="globalHidden"
          :sub1="{ label: 'Recebido', value: data.receitas.recebido, color: 'green' }"
          :sub2="{ label: 'A receber', value: data.receitas.aReceber, color: 'orange' }"
        />
        <DashboardResumoCard
          title="Despesas"
          :value="data.despesas.pago"
          value-color="red"
          icon="i-heroicons-arrow-trending-down"
          :period="periodLabel"
          show-eye
          :hidden="globalHidden"
          :sub1="{ label: 'Pago', value: data.despesas.pago, color: 'green' }"
          :sub2="{ label: 'A pagar', value: data.despesas.aPagar, color: 'red' }"
        />
        <DashboardResumoCard
          title="Saldo Atual"
          :value="saldoAtualValor"
          value-color="blue"
          icon="i-heroicons-banknotes"
          :period="todayLabel"
          :subtitle2="saldoAtualSubtitle"
          show-eye
          :hidden="globalHidden"
          :toggle-options="saldoAtualToggleOptions"
          :toggle="saldoAtualModo"
          @update:toggle="onSaldoAtualToggle"
          :sub1="saldoAtualSub1"
          :sub2="saldoAtualSub2"
        />
      </div>

      <!-- Orçamento -->
      <ReportsBudgetStatus v-if="budgetData" :data="budgetData" />

      <!-- Contas a Pagar / Entradas -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardContasPagar :total="data.contasPagar.total" :items="data.contasPagar.items" :cartoes="data.cartoes" :month="currentMonth" />
        <DashboardEntradas :total="data.receitas.recebido + data.receitas.aReceber" :items="data.receitas.items" />
      </div>

      <!-- Composição das despesas -->
      <DashboardComposicaoDespesas
        v-if="composicaoData"
        :conta-avulso="composicaoData.contaAvulso"
        :cartao-avulso="composicaoData.cartaoAvulso"
        :conta-parcelado="composicaoData.contaParcelado"
        :cartao-parcelado="composicaoData.cartaoParcelado"
        :conta-recorrente="composicaoData.contaRecorrente"
        :cartao-recorrente="composicaoData.cartaoRecorrente"
        :total="composicaoData.total"
        :period="periodLabel"
        compact
      />

      <!-- Gastos por Categoria + Limite de Gastos -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardGastosCategorias :dados="data.gastosPorCategoria" :period="periodLabel" />
        <DashboardLimiteGastos
          :itens="limitesData?.itens ?? []"
          :total-limitado="limitesData?.totalLimitado ?? 0"
          :total-gasto-limitado="limitesData?.totalGastoLimitado ?? 0"
        />
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
const globalHidden = ref(false)
const saldoAtualModo = ref<'contas' | 'total'>('contas')
const { format } = useCurrency()

function onSaldoAtualToggle(id: string) {
  if (id === 'contas' || id === 'total') saldoAtualModo.value = id
}

const now = new Date()
const currentMonth = ref(
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
)

const { data, pending, error } = await useFetch('/api/dashboard', {
  query: computed(() => ({ month: currentMonth.value })),
  watch: [currentMonth],
  getCachedData: () => null,
})

const { data: composicaoData } = await useFetch('/api/dashboard/composicao', {
  query: computed(() => ({ month: currentMonth.value })),
  watch: [currentMonth],
  getCachedData: () => null,
})

const { data: budgetData } = await useFetch('/api/reports/budget-status', {
  query: computed(() => ({ month: currentMonth.value })),
  watch: [currentMonth],
  getCachedData: () => null,
})

const { data: limitesData } = await useFetch('/api/limites', {
  query: computed(() => ({ month: currentMonth.value, modo: 'categoria' })),
  watch: [currentMonth]
})

const mesesPt = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const periodLabel = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const nome = mesesPt[m - 1]
  return `1 de ${nome} - ${lastDay} de ${nome}`
})

const prevMonthEndLabel = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const prevY = m === 1 ? y - 1 : y
  const prevM = m === 1 ? 12 : m - 1
  const lastDay = new Date(prevY, prevM, 0).getDate()
  return `Até ${lastDay} de ${mesesPt[prevM - 1]}`
})

const currentMonthEndLabel = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return `Até ${lastDay} de ${mesesPt[m - 1]}`
})

const todayLabel = computed(() => {
  const now = new Date()
  return `Hoje, ${now.getDate()} de ${mesesPt[now.getMonth()]}`
})

const saldoAtualToggleOptions = computed(() => {
  if (!data.value || (data.value.patrimonioExternoIncluido ?? 0) <= 0) return undefined
  return [
    { id: 'contas', label: 'Contas' },
    { id: 'total', label: 'Total' },
  ]
})

const saldoAtualValor = computed(() => {
  if (!data.value) return 0
  if (saldoAtualModo.value === 'total' && (data.value.patrimonioExternoIncluido ?? 0) > 0) {
    return data.value.saldoGeral ?? data.value.saldoBancario
  }
  return data.value.saldoBancario
})

const saldoAtualSubtitle = computed(() => {
  if (!data.value) return ''
  if (saldoAtualModo.value === 'total' && (data.value.patrimonioExternoIncluido ?? 0) > 0) {
    return `Contas ${format(data.value.saldoBancario)} + reservas ${format(data.value.patrimonioExternoIncluido)}`
  }
  return 'Saldo nas contas bancárias'
})

const saldoAtualUsaTotal = computed(
  () => saldoAtualModo.value === 'total' && (data.value?.patrimonioExternoIncluido ?? 0) > 0,
)

const saldoAtualSub1 = computed(() => {
  if (!data.value) return { label: 'Previsto fim do mês', value: 0, color: 'blue' as const }
  if (saldoAtualUsaTotal.value) {
    return {
      label: 'Previsto fim do mês (total)',
      value: data.value.saldoPrevistoTotal ?? data.value.saldoPrevisto,
      color: 'blue' as const,
    }
  }
  return {
    label: 'Previsto fim do mês (contas)',
    value: data.value.saldoPrevisto,
    color: 'blue' as const,
  }
})

const saldoAtualSub2 = computed(() => {
  if (!data.value) return { label: 'Resultado do mês', value: 0, color: 'green' as const }
  const delta = saldoAtualUsaTotal.value
    ? (data.value.saldoPrevistoTotal ?? data.value.saldoPrevisto) - (data.value.saldoAnteriorTotal ?? data.value.saldoAnterior)
    : data.value.saldoPrevisto - data.value.saldoAnterior
  return {
    label: 'Resultado do mês',
    value: delta,
    color: (delta >= 0 ? 'green' : 'red') as 'green' | 'red',
  }
})

useHead({ title: 'Dashboard — Gestão Financeira' })
</script>
