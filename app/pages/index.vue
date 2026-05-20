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
          title="Saldo Previsto"
          :value="data.saldoPrevisto"
          value-color="blue"
          icon="i-heroicons-arrow-trending-up"
          :period="currentMonthEndLabel"
          subtitle2="(Receita - Despesa + Saldo)"
          show-eye
          :hidden="globalHidden"
          :sub1="{ label: 'Disponível', value: data.saldoDisponivel, color: 'blue' }"
          :sub2="{ label: 'Previsto', value: data.saldoPrevisto, color: 'blue' }"
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

useHead({ title: 'Dashboard — Gestão Financeira' })
</script>
