<template>
  <div class="relative flex items-center w-full">
    <span class="absolute left-3 text-sm text-gray-400 pointer-events-none select-none">R$</span>
    <Money3Component
      v-model="model"
      v-bind="config"
      class="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900
             text-sm text-gray-900 dark:text-white pl-9 pr-3 py-1.5
             focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
             placeholder:text-gray-400"
      placeholder="0,00"
    />
  </div>
</template>

<script setup lang="ts">
import { Money3Component } from 'v-money3'

const props = defineProps<{ modelValue?: number }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const model = computed({
  get: () => props.modelValue ?? 0,
  set: (val) => emit('update:modelValue', Number(val))
})

const config = {
  decimal: ',',
  thousands: '.',
  prefix: '',
  suffix: '',
  precision: 2,
  masked: false,
  disableNegative: true,
  minimumNumberOfCharacters: 0,
}
</script>
