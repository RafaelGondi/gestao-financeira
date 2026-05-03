<template>
  <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-5 flex flex-col gap-0">
    <!-- Header row -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <UIcon :name="icon" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </div>
        <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ title }}</span>
      </div>
      <button v-if="showEye" class="text-gray-300 dark:text-gray-600 hover:text-gray-500 transition-colors" @click="hidden = !hidden">
        <UIcon :name="hidden ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="w-4 h-4" />
      </button>
    </div>

    <!-- Main value -->
    <div class="mt-3">
      <p class="text-2xl font-bold leading-tight" :class="valueColorClass">
        {{ hidden ? '••••••' : format(value) }}
      </p>
      <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
        <p class="text-xs text-gray-400">{{ period }}</p>
        <p v-if="subtitle2" class="text-xs text-gray-300 dark:text-gray-600">{{ subtitle2 }}</p>
      </div>
    </div>

    <!-- Divider + toggle -->
    <div class="mt-4 border-t border-gray-100 dark:border-gray-800 pt-3">
      <button
        class="flex items-center justify-between w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-3"
        @click="showDetails = !showDetails"
      >
        <span>{{ showDetails ? 'Ocultar detalhes' : 'Ver detalhes' }}</span>
        <UIcon :name="showDetails ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="w-3.5 h-3.5" />
      </button>

      <div v-if="showDetails" class="grid grid-cols-2 gap-3">
        <div class="pl-3 border-l-2" :class="subBorderClass(sub1.color)">
          <p class="text-xs text-gray-400 mb-0.5">{{ sub1.label }}</p>
          <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {{ hidden ? '•••' : format(sub1.value) }}
          </p>
        </div>
        <div class="pl-3 border-l-2" :class="subBorderClass(sub2.color)">
          <p class="text-xs text-gray-400 mb-0.5">{{ sub2.label }}</p>
          <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {{ hidden ? '•••' : format(sub2.value) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type Color = 'green' | 'red' | 'orange' | 'blue'

interface SubCard {
  label: string
  value: number
  color: Color
}


const props = defineProps<{
  title: string
  value: number
  valueColor: 'green' | 'red' | 'blue' | 'default'
  icon: string
  period: string
  subtitle2?: string
  showEye?: boolean
  sub1: SubCard
  sub2: SubCard
}>()

const { format } = useCurrency()
const showDetails = ref(true)
const hidden = ref(false)

const valueColorMap: Record<string, string> = {
  green: 'text-green-900 dark:text-green-400',
  red:   'text-red-900 dark:text-red-400',
  blue:  'text-blue-900 dark:text-blue-400',
}
const valueColorClass = computed(() => valueColorMap[props.valueColor] ?? 'text-gray-900 dark:text-white')

function subBorderClass(color: Color) {
  return {
    green: 'border-green-400 dark:border-green-500',
    red: 'border-red-400 dark:border-red-500',
    orange: 'border-orange-400 dark:border-orange-500',
    blue: 'border-blue-400 dark:border-blue-500',
  }[color]
}
</script>
