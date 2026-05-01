<template>
  <div class="relative" ref="container">
    <!-- Tag selecionada -->
    <div
      v-if="modelValue && !editing"
      class="flex items-center gap-2 min-h-9 px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
      @click="startEdit"
    >
      <span class="inline-flex items-center gap-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-medium px-2 py-0.5 rounded-full">
        <UIcon name="i-heroicons-tag" class="w-3 h-3" />
        {{ modelValue }}
      </span>
      <button
        type="button"
        class="ml-auto flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        @click.stop="clear"
      >
        <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
      </button>
    </div>

    <!-- Input -->
    <input
      v-else
      ref="inputRef"
      v-model="query"
      class="w-full min-h-9 px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-primary-500 dark:focus:border-primary-400 focus:ring-1 focus:ring-primary-500 dark:focus:ring-primary-400 transition-colors"
      :placeholder="placeholder ?? 'Buscar ou criar categoria...'"
      @focus="open = true"
      @blur="onBlur"
      @keydown.enter.prevent="selectFirst"
      @keydown.escape="open = false"
      @input="open = true"
    />

    <!-- Dropdown -->
    <div
      v-if="open && (filteredItems.length > 0 || query.trim().length > 0)"
      class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
    >
      <div class="max-h-48 overflow-y-auto">
        <button
          v-for="item in filteredItems"
          :key="item"
          type="button"
          class="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
          @mousedown.prevent="select(item)"
        >
          <UIcon name="i-heroicons-tag" class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          {{ item }}
        </button>
        <div v-if="filteredItems.length === 0 && !showCreate" class="px-3 py-2 text-sm text-gray-400 italic">
          Nenhuma categoria encontrada
        </div>
      </div>
      <button
        v-if="showCreate"
        type="button"
        class="w-full text-left px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center gap-2 transition-colors"
        :class="filteredItems.length > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''"
        @mousedown.prevent="create"
      >
        <UIcon name="i-heroicons-plus-circle" class="w-4 h-4 flex-shrink-0" />
        Criar "{{ query.trim() }}"
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { data: todasCategorias, refresh: refreshCategorias } = await useFetch<string[]>('/api/categorias')

const query = ref('')
const open = ref(false)
const editing = ref(!props.modelValue)
const inputRef = ref<HTMLInputElement | null>(null)
const container = ref<HTMLElement | null>(null)

watch(() => props.modelValue, (val) => {
  editing.value = !val
  if (!val) query.value = ''
}, { immediate: false })

const filteredItems = computed(() => {
  const cats = todasCategorias.value ?? []
  if (!query.value.trim()) return cats
  return cats.filter(c => c.toLowerCase().includes(query.value.toLowerCase().trim()))
})

const exactMatch = computed(() =>
  (todasCategorias.value ?? []).some(c => c.toLowerCase() === query.value.toLowerCase().trim())
)

const showCreate = computed(() => !!query.value.trim() && !exactMatch.value)

function select(item: string) {
  emit('update:modelValue', item)
  query.value = ''
  open.value = false
  editing.value = false
}

function create() {
  const val = query.value.trim()
  if (!val) return
  emit('update:modelValue', val)
  refreshCategorias()
  query.value = ''
  open.value = false
  editing.value = false
}

function clear() {
  emit('update:modelValue', '')
  query.value = ''
  editing.value = true
  nextTick(() => inputRef.value?.focus())
}

function startEdit() {
  editing.value = true
  nextTick(() => {
    inputRef.value?.focus()
    open.value = true
  })
}

function selectFirst() {
  if (filteredItems.value.length > 0) {
    select(filteredItems.value[0])
  } else if (query.value.trim()) {
    create()
  }
}

function onBlur() {
  setTimeout(() => {
    open.value = false
    if (props.modelValue) editing.value = false
  }, 150)
}
</script>
