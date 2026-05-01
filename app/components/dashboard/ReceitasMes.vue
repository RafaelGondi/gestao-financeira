<template>
  <UCard class="border-0 shadow-sm">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <UIcon name="i-heroicons-plus-circle" class="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <h3 class="font-semibold text-gray-800 dark:text-gray-100">Receitas do Mês</h3>
        </div>
        <UBadge color="green" variant="soft" size="sm">{{ items.length }}</UBadge>
      </div>
    </template>

    <div class="space-y-1">
      <div v-if="items.length === 0" class="text-center py-4 text-gray-400 text-sm">
        Nenhuma receita neste mês
      </div>
      <div
        v-for="item in items"
        :key="item.id"
        class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
      >
        <div class="flex items-center gap-2">
          <UBadge
            v-if="item.categoria"
            :label="item.categoria"
            color="green"
            variant="subtle"
            size="xs"
          />
          <div>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ item.descricao }}</p>
            <p class="text-xs text-gray-400">{{ formatDate(item.data) }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UBadge
            :label="item.pago ? 'Recebido' : 'Pendente'"
            :color="item.pago ? 'green' : 'yellow'"
            variant="soft"
            size="xs"
          />
          <span class="text-sm font-semibold text-green-600 dark:text-green-400">{{ format(item.valor) }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between pt-2">
        <span class="text-sm text-gray-500">Total do Mês</span>
        <span class="text-lg font-bold text-green-600 dark:text-green-400">{{ format(total) }}</span>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
interface Item {
  id: number
  descricao: string
  valor: number
  data: string
  pago: number
  categoria?: string
}

defineProps<{
  total: number
  items: Item[]
}>()

const { format } = useCurrency()

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('pt-BR')
}
</script>
