<template>
  <UCard class="border-0">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Saldo Bancário</p>
        <p
          class="text-3xl font-bold mt-1"
          :class="saldoBancario >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
        >
          {{ format(saldoBancario) }}
        </p>
        <p class="text-xs text-gray-400 mt-1">Total em contas bancárias</p>
      </div>
      <div
        class="w-14 h-14 rounded-full flex items-center justify-center"
        :class="saldoBancario >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'"
      >
        <UIcon
          :name="saldoBancario >= 0 ? 'i-heroicons-building-library' : 'i-heroicons-exclamation-triangle'"
          class="w-7 h-7"
          :class="saldoBancario >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
        />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
defineProps<{ saldo: number; saldoBancario: number }>()
const { format } = useCurrency()
</script>
