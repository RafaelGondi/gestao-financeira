<template>
  <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <UIcon name="i-heroicons-chart-bar" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
        <h3 class="font-semibold text-gray-800 dark:text-gray-100">Limite de Gastos</h3>
      </div>
      <NuxtLink to="/limites" class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
        Gerenciar
      </NuxtLink>
    </div>

    <!-- Sem limites definidos -->
    <div v-if="!limitados.length" class="flex-1 flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
      <UIcon name="i-heroicons-chart-bar" class="w-8 h-8" />
      <p class="text-sm">Nenhum limite definido</p>
      <NuxtLink to="/limites" class="text-xs text-primary-500 hover:text-primary-600 transition-colors">
        Definir limites
      </NuxtLink>
    </div>

    <template v-else>
      <!-- Barra total -->
      <div class="px-5 pt-4 pb-3">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs text-gray-500">Total</span>
          <span class="text-xs font-medium" :class="totalOver ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'">
            {{ format(props.totalGastoLimitado) }} <span class="text-gray-400 font-normal">de {{ format(props.totalLimitado) }}</span>
          </span>
        </div>
        <div class="w-full h-2 rounded-full" :class="totalOver ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'">
          <div
            class="h-2 rounded-full transition-all"
            :class="totalOver ? 'bg-red-500' : 'bg-primary-500'"
            :style="{ width: Math.min(totalPct, 100) + '%' }"
          />
        </div>
      </div>

      <!-- Lista de categorias com limite -->
      <div class="px-5 pb-4 flex-1 space-y-3">
        <div v-for="item in limitados" :key="item.referencia">
          <div class="flex items-center gap-2 mb-1">
            <div class="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" :style="{ background: item.cor }">
              <UIcon :name="item.icone" class="w-3 h-3 text-white" />
            </div>
            <span class="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">{{ item.referencia }}</span>
            <span class="text-xs font-medium flex-shrink-0" :class="item.gasto > item.limite! ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'">
              {{ format(item.gasto) }}
            </span>
            <span class="text-xs text-gray-400 flex-shrink-0">/ {{ format(item.limite!) }}</span>
          </div>
          <div class="w-full h-1.5 rounded-full" :class="item.gasto > item.limite! ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'">
            <div
              class="h-1.5 rounded-full transition-all"
              :style="{
                width: Math.min((item.gasto / item.limite!) * 100, 100) + '%',
                background: item.gasto > item.limite! ? '#ef4444' : item.cor,
              }"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
interface LimiteItem {
  referencia: string
  cor: string
  icone: string
  gasto: number
  limite: number | null
  limiteId: number | null
}

const props = defineProps<{
  itens: LimiteItem[]
  totalLimitado: number
  totalGastoLimitado: number
}>()

const { format } = useCurrency()

const limitados = computed(() => props.itens.filter(i => i.limite !== null))
const totalOver = computed(() => props.totalGastoLimitado > props.totalLimitado)
const totalPct = computed(() =>
  props.totalLimitado > 0 ? (props.totalGastoLimitado / props.totalLimitado) * 100 : 0
)
</script>
