<template>
  <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <UIcon name="i-heroicons-arrow-down-circle" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
        <h3 class="font-semibold text-gray-800 dark:text-gray-100">Entradas</h3>
      </div>
      <span class="text-xs font-medium text-gray-400">{{ items.length }} item{{ items.length !== 1 ? 's' : '' }}</span>
    </div>

    <!-- Lista -->
    <div class="divide-y divide-gray-100 dark:divide-gray-800 flex-1">
      <div v-if="items.length === 0" class="text-center py-8 text-gray-400 text-sm">
        Nenhuma receita neste mês
      </div>
      <div
        v-for="item in itemsOrdenados"
        :key="`${item.id}-${item.fixa}`"
        class="flex items-center gap-3 px-5 py-3.5"
      >
        <!-- Ícone categoria -->
        <div
          class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          :style="item.categoria_icone ? { background: item.categoria_cor } : {}"
          :class="!item.categoria_icone ? 'bg-gray-100 dark:bg-gray-800' : ''"
        >
          <UIcon
            :name="item.categoria_icone ?? 'i-heroicons-arrow-trending-up'"
            class="w-4 h-4"
            :class="item.categoria_icone ? 'text-white' : 'text-gray-400'"
          />
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ item.descricao }}</p>
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="text-xs text-gray-400">{{ formatDate(item.data) }}</span>
            <template v-if="item.categoria">
              <span class="text-gray-300 dark:text-gray-700">·</span>
              <span class="text-xs text-gray-400">{{ item.categoria }}</span>
            </template>
          </div>
        </div>

        <!-- Valor + status -->
        <div class="flex items-center gap-2.5 flex-shrink-0">
          <span class="text-sm font-medium text-gray-800 dark:text-gray-100">{{ format(item.valor) }}</span>
          <span
            class="text-xs px-2 py-0.5 rounded-full"
            :class="item.pago
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500'"
          >
            {{ item.pago ? 'Recebido' : 'A receber' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800">
      <span class="text-sm text-gray-500">Total do mês</span>
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
  pago: number
  fixa: number
  categoria: string | null
  categoria_icone: string | null
  categoria_cor: string | null
}

const props = defineProps<{ total: number; items: Item[] }>()

const { format } = useCurrency()

const itemsOrdenados = computed(() =>
  [...props.items].sort((a, b) => b.data.localeCompare(a.data))
)

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR')
}
</script>
