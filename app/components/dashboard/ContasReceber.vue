<template>
  <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <UIcon name="i-heroicons-arrow-down-circle" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
        <h3 class="font-semibold text-gray-800 dark:text-gray-100">Contas a Receber</h3>
      </div>
      <span class="text-xs font-medium text-gray-400">{{ items.length }}</span>
    </div>

    <!-- Items -->
    <div class="px-5 py-3 flex-1">
      <div v-if="items.length === 0" class="text-center py-4 text-gray-400 text-sm">
        Nenhuma conta a receber
      </div>
      <div
        v-for="item in items"
        :key="item.id"
        class="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0"
      >
        <div class="flex items-center gap-2.5">
          <div
            class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            :style="item.categoria_icone && item.categoria_cor ? { background: item.categoria_cor } : {}"
            :class="!item.categoria_icone ? 'bg-gray-100 dark:bg-gray-800' : ''"
          >
            <UIcon
              :name="item.categoria_icone ?? 'i-heroicons-clock'"
              class="w-4 h-4"
              :class="item.categoria_icone ? 'text-white' : 'text-gray-400'"
            />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ item.descricao }}</p>
            <p class="text-xs text-gray-400">{{ formatDate(item.data) }}</p>
          </div>
        </div>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ format(item.valor) }}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800">
      <span class="text-sm text-gray-500">Total</span>
      <span class="text-base font-semibold text-green-800 dark:text-green-400">{{ format(total) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Item {
  id: number
  descricao: string
  valor: number
  data: string
  categoria_icone: string | null
  categoria_cor: string | null
}

defineProps<{ total: number; items: Item[] }>()

const { format } = useCurrency()

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR')
}
</script>
