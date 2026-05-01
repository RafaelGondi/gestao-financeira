<template>
  <UCard class="border-0 shadow-sm">
    <template #header>
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
          <UIcon name="i-heroicons-credit-card" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 class="font-semibold text-gray-800 dark:text-gray-100">Meus Cartões</h3>
      </div>
    </template>

    <div class="space-y-3">
      <div v-if="cartoes.length === 0" class="text-center py-6 text-gray-400 text-sm">
        <UIcon name="i-heroicons-credit-card" class="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>Nenhum cartão cadastrado</p>
        <NuxtLink to="/cartoes" class="text-primary-500 text-xs hover:underline mt-1 block">
          Adicionar cartão
        </NuxtLink>
      </div>
      <div
        v-for="cartao in cartoes"
        :key="cartao.id"
        class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <UIcon name="i-heroicons-credit-card" class="w-5 h-5 text-white" />
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">{{ cartao.nome }}</p>
            <p class="text-xs text-gray-400">{{ cartao.banco }}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-xs text-gray-400 mb-0.5">Fatura</p>
          <p
            class="text-sm font-bold"
            :class="cartao.fatura > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'"
          >
            {{ format(cartao.fatura) }}
          </p>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface Cartao {
  id: number
  nome: string
  banco: string
  fatura: number
}

defineProps<{ cartoes: Cartao[] }>()

const { format } = useCurrency()
</script>
