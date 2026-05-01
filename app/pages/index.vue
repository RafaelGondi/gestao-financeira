<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p class="text-sm text-gray-500 mt-1">Visão geral das suas finanças</p>
      </div>
    </div>

    <!-- Month Navigator -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl px-6 py-4 shadow-sm border border-gray-100 dark:border-gray-800">
      <DashboardMonthNavigator v-model="currentMonth" />
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <USkeleton v-for="i in 6" :key="i" class="h-40 rounded-2xl" />
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
      <!-- Top Summary Row -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardSaldoGeral :saldo="data.saldo" />

        <UCard class="border-0 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Contas a Pagar</p>
              <p class="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">
                {{ format(data.contasPagar.total) }}
              </p>
              <p class="text-xs text-gray-400 mt-1">{{ data.contasPagar.items.length }} pendente(s)</p>
            </div>
            <div class="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <UIcon name="i-heroicons-arrow-up-circle" class="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </UCard>

        <UCard class="border-0 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Contas a Receber</p>
              <p class="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
                {{ format(data.contasReceber.total) }}
              </p>
              <p class="text-xs text-gray-400 mt-1">{{ data.contasReceber.items.length }} pendente(s)</p>
            </div>
            <div class="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <UIcon name="i-heroicons-arrow-down-circle" class="w-7 h-7 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </UCard>
      </div>

      <!-- Meus Cartões + Details Row -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-1">
          <DashboardMeusCartoes :cartoes="data.cartoes" />
        </div>
        <div class="lg:col-span-2 grid grid-cols-1 gap-4">
          <DashboardContasPagar :total="data.contasPagar.total" :items="data.contasPagar.items" />
          <DashboardContasReceber :total="data.contasReceber.total" :items="data.contasReceber.items" />
        </div>
      </div>

      <!-- Receitas e Despesas -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardReceitasMes :total="data.receitas.total" :items="data.receitas.items" />
        <DashboardDespesasMes :total="data.despesas.total" :items="data.despesas.items" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { format } = useCurrency()

// Current month as YYYY-MM
const now = new Date()
const currentMonth = ref(
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
)

const { data, pending, error, refresh } = await useFetch('/api/dashboard', {
  query: computed(() => ({ month: currentMonth.value })),
  watch: [currentMonth]
})

useHead({
  title: 'Dashboard — Gestão Financeira'
})
</script>
