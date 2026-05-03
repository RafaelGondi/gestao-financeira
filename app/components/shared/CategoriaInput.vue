<template>
  <div class="relative" ref="container">
    <!-- Tag selecionada -->
    <div
      v-if="modelValue && !editing"
      class="flex items-center gap-2 min-h-9 px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
      @click="startEdit"
    >
      <span
        class="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full text-white"
        :style="selectedCat ? { background: selectedCat.cor } : { background: '#6366f1' }"
      >
        <UIcon :name="selectedCat?.icone ?? 'i-heroicons-tag'" class="w-3 h-3" />
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
      :placeholder="placeholder ?? 'Buscar categoria...'"
      @focus="open = true"
      @blur="onBlur"
      @keydown.enter.prevent="selectFirst"
      @keydown.escape="open = false"
      @input="open = true"
    />

    <!-- Dropdown -->
    <div
      v-if="open && filteredItems.length > 0"
      class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
    >
      <div class="max-h-48 overflow-y-auto">
        <button
          v-for="item in filteredItems"
          :key="item.id"
          type="button"
          class="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
          @mousedown.prevent="select(item)"
        >
          <span
            class="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
            :style="{ background: item.cor }"
          >
            <UIcon :name="item.icone" class="w-3 h-3 text-white" />
          </span>
          {{ item.nome }}
        </button>
        <div v-if="filteredItems.length === 0" class="px-3 py-2 text-sm text-gray-400 italic">
          Nenhuma categoria encontrada
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Categoria {
  id: number
  nome: string
  tipo: string
  cor: string
  icone: string
}

const props = defineProps<{
  modelValue: string
  placeholder?: string
  tipo?: 'despesa' | 'receita' | 'transferencia'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { data: todasCategorias } = await useFetch<Categoria[]>('/api/categorias')

const query = ref('')
const open = ref(false)
const editing = ref(!props.modelValue)
const inputRef = ref<HTMLInputElement | null>(null)
const container = ref<HTMLElement | null>(null)

watch(() => props.modelValue, (val) => {
  editing.value = !val
  if (!val) query.value = ''
}, { immediate: false })

const selectedCat = computed(() =>
  (todasCategorias.value ?? []).find(c => c.nome === props.modelValue) ?? null
)

const filteredItems = computed(() => {
  let cats = todasCategorias.value ?? []
  if (props.tipo) cats = cats.filter(c => c.tipo === props.tipo)
  if (!query.value.trim()) return cats
  return cats.filter(c => c.nome.toLowerCase().includes(query.value.toLowerCase().trim()))
})

function select(item: Categoria) {
  emit('update:modelValue', item.nome)
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
  if (filteredItems.value.length > 0) select(filteredItems.value[0])
}

function onBlur() {
  setTimeout(() => {
    open.value = false
    if (props.modelValue) editing.value = false
  }, 150)
}
</script>
