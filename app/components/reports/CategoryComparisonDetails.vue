<template>
  <div class="px-4 sm:px-5 py-4 bg-gray-50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
    <div v-if="loading" class="py-4 text-center text-sm text-gray-400">
      Carregando lançamentos...
    </div>
    <div v-else-if="details" class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      <div>
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{{ labelA }}</p>
        <div v-if="details.itens_a.length" class="space-y-1">
          <div
            v-for="item in details.itens_a"
            :key="`a-${item.id}-${item.data}-${item.valor}`"
            class="flex items-start justify-between gap-3 py-2 border-b border-gray-100 dark:border-gray-800/60 last:border-0"
          >
            <div class="min-w-0">
              <p class="text-sm text-gray-700 dark:text-gray-300 truncate">{{ item.descricao }}</p>
              <p class="text-xs text-gray-400 mt-0.5">
                {{ fmtDate(item.data) }} · {{ item.origem }}
                <span v-if="modo === 'supercategoria' && item.categoria"> · {{ item.categoria }}</span>
                <span v-if="item.fixa" class="text-gray-400"> · fixo</span>
              </p>
            </div>
            <p class="text-sm font-medium text-gray-800 dark:text-gray-100 flex-shrink-0">{{ format(item.valor) }}</p>
          </div>
        </div>
        <p v-else class="text-sm text-gray-400 py-2">Nenhum lançamento neste mês</p>
      </div>
      <div>
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{{ labelB }}</p>
        <div v-if="details.itens_b.length" class="space-y-1">
          <div
            v-for="item in details.itens_b"
            :key="`b-${item.id}-${item.data}-${item.valor}`"
            class="flex items-start justify-between gap-3 py-2 border-b border-gray-100 dark:border-gray-800/60 last:border-0"
          >
            <div class="min-w-0">
              <p class="text-sm text-gray-700 dark:text-gray-300 truncate">{{ item.descricao }}</p>
              <p class="text-xs text-gray-400 mt-0.5">
                {{ fmtDate(item.data) }} · {{ item.origem }}
                <span v-if="modo === 'supercategoria' && item.categoria"> · {{ item.categoria }}</span>
                <span v-if="item.fixa" class="text-gray-400"> · fixo</span>
              </p>
            </div>
            <p class="text-sm font-medium text-gray-800 dark:text-gray-100 flex-shrink-0">{{ format(item.valor) }}</p>
          </div>
        </div>
        <p v-else class="text-sm text-gray-400 py-2">Nenhum lançamento neste mês</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ExpenseDetail {
  id: number
  descricao: string
  valor: number
  data: string
  categoria: string | null
  origem: string
  fixa: boolean
}

defineProps<{
  labelA: string
  labelB: string
  modo: 'categoria' | 'supercategoria'
  loading: boolean
  details: { itens_a: ExpenseDetail[]; itens_b: ExpenseDetail[] } | null
}>()

const { format } = useCurrency()

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}
</script>
