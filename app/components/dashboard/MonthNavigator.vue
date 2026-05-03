<template>
  <div class="flex items-center justify-between gap-4">
    <!-- Navegação com setas à esquerda -->
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="prev"
      >
        <UIcon name="i-heroicons-chevron-left" class="w-4 h-4" />
      </button>
      <span class="text-base font-semibold text-gray-800 dark:text-gray-100 capitalize px-1">
        {{ displayLabel }}
      </span>
      <button
        type="button"
        class="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="next"
      >
        <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
      </button>
    </div>

    <!-- Seletor rápido à direita -->
    <div class="flex items-center gap-2">
      <select
        :value="selectedMonth"
        class="text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
        @change="onMonthChange"
      >
        <option v-for="(nome, idx) in meses" :key="idx" :value="idx + 1">{{ nome }}</option>
      </select>
      <select
        :value="selectedYear"
        class="text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
        @change="onYearChange"
      >
        <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string // YYYY-MM
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const now = new Date()
const years = Array.from({ length: 11 }, (_, i) => now.getFullYear() - 5 + i)

const selectedYear = computed(() => Number(props.modelValue.split('-')[0]))
const selectedMonth = computed(() => Number(props.modelValue.split('-')[1]))

const displayLabel = computed(() => {
  const [year, month] = props.modelValue.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
})

function emitValue(year: number, month: number) {
  emit('update:modelValue', `${year}-${String(month).padStart(2, '0')}`)
}

function onMonthChange(e: Event) {
  emitValue(selectedYear.value, Number((e.target as HTMLSelectElement).value))
}

function onYearChange(e: Event) {
  emitValue(Number((e.target as HTMLSelectElement).value), selectedMonth.value)
}

function addMonths(yyyyMm: string, delta: number): string {
  const [year, month] = yyyyMm.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function prev() { emit('update:modelValue', addMonths(props.modelValue, -1)) }
function next() { emit('update:modelValue', addMonths(props.modelValue, 1)) }
</script>
