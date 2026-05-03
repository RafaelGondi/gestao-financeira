<template>
  <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden h-full">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <UIcon name="i-heroicons-credit-card" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
        <h3 class="font-semibold text-gray-800 dark:text-gray-100">Meus Cartões</h3>
      </div>
      <NuxtLink to="/cartoes" class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Ver todos</NuxtLink>
    </div>

    <!-- Empty -->
    <div v-if="cartoes.length === 0" class="flex flex-col items-center justify-center py-10 px-5 text-center">
      <UIcon name="i-heroicons-credit-card" class="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
      <p class="text-sm text-gray-400">Nenhum cartão cadastrado</p>
      <NuxtLink to="/cartoes" class="text-primary-500 text-xs hover:underline mt-1">Adicionar cartão</NuxtLink>
    </div>

    <!-- Lista de cartões -->
    <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
      <NuxtLink
        v-for="cartao in cartoes"
        :key="cartao.id"
        :to="`/cartoes/${cartao.id}`"
        class="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <!-- Mini card visual -->
        <div
          class="w-12 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          :style="cardStyle(cartao)"
        >
          <SharedBankLogo :bank="findBank(cartao.banco_key)" :size="22" />
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{{ cartao.nome }}</p>
          <p class="text-xs text-gray-400 truncate">{{ cartao.banco }}</p>
        </div>

        <!-- Fatura -->
        <div class="text-right flex-shrink-0">
          <p class="text-xs text-gray-400 mb-0.5">Fatura</p>
          <p
            class="text-sm font-bold"
            :class="cartao.fatura > 0 ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400'"
          >
            {{ format(cartao.fatura) }}
          </p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Cartao {
  id: number
  nome: string
  banco: string
  banco_key: string
  fatura: number
  cor: string | null
}

defineProps<{ cartoes: Cartao[] }>()

const { format } = useCurrency()
const { findBank } = useBanks()

function cardStyle(cartao: Cartao) {
  const color = cartao.cor ?? findBank(cartao.banco_key)?.color ?? '#6366f1'
  return { background: `linear-gradient(135deg, ${color}ee 0%, ${color}99 100%)` }
}
</script>
