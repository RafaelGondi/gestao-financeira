<template>
  <div class="flex items-center justify-center gap-4">
    <UButton
      icon="i-heroicons-chevron-left"
      variant="ghost"
      color="neutral"
      size="sm"
      @click="prev"
    />
    <div class="text-lg font-semibold text-gray-800 dark:text-gray-100 min-w-[180px] text-center capitalize">
      {{ displayLabel }}
    </div>
    <UButton
      icon="i-heroicons-chevron-right"
      variant="ghost"
      color="neutral"
      size="sm"
      @click="next"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string // YYYY-MM
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const displayLabel = computed(() => {
  const [year, month] = props.modelValue.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
})

function addMonths(yyyyMm: string, delta: number): string {
  const [year, month] = yyyyMm.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function prev() {
  emit('update:modelValue', addMonths(props.modelValue, -1))
}

function next() {
  emit('update:modelValue', addMonths(props.modelValue, 1))
}
</script>
