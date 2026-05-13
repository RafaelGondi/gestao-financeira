<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-150"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
        @mousedown.self="$emit('close')"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" @mousedown="$emit('close')" />

        <!-- Panel -->
        <Transition
          enter-active-class="transition ease-out duration-150"
          enter-from-class="opacity-0 scale-95 -translate-y-2"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition ease-in duration-100"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 -translate-y-2"
        >
          <div
            v-if="open"
            class="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            <!-- Input -->
            <div class="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
              <UIcon name="i-heroicons-magnifying-glass" class="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                ref="inputRef"
                v-model="query"
                type="text"
                placeholder="Buscar por descrição ou nome na fatura..."
                class="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
                @keydown.escape="$emit('close')"
              />
              <button
                v-if="query"
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer flex-shrink-0"
                @click="query = ''"
              >
                <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
              </button>
              <kbd class="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 flex-shrink-0">Esc</kbd>
            </div>

            <!-- Resultados -->
            <div class="max-h-[28rem] overflow-y-auto">
              <!-- Loading -->
              <div v-if="pending" class="p-4 space-y-2">
                <USkeleton v-for="i in 3" :key="i" class="h-14 rounded-lg" />
              </div>

              <!-- Resultados -->
              <template v-else-if="debouncedQuery.length >= 2 && data?.results.length">
                <div class="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                  <p class="text-xs text-gray-400">{{ data.results.length }} resultado{{ data.results.length !== 1 ? 's' : '' }}</p>
                </div>
                <div
                  v-for="r in data.results"
                  :key="r.id"
                  class="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-default"
                >
                  <div
                    class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    :class="r.tipo === 'receita' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-800'"
                  >
                    <UIcon
                      :name="r.tipo === 'receita' ? 'i-heroicons-arrow-down-left' : 'i-heroicons-arrow-up-right'"
                      class="w-3.5 h-3.5"
                      :class="r.tipo === 'receita' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'"
                    />
                  </div>

                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate" v-html="highlight(r.descricao)" />
                      <span v-if="r.fixa" class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 flex-shrink-0">Fixa</span>
                    </div>
                    <p v-if="r.nome_fatura" class="text-xs text-gray-400 font-mono truncate" v-html="highlight(r.nome_fatura)" />
                    <div class="flex items-center gap-1.5 mt-0.5">
                      <p class="text-xs text-gray-400">{{ fmtDate(r.data) }}</p>
                      <span v-if="r.categoria" class="text-xs text-gray-400">· {{ r.categoria }}</span>
                      <span v-if="r.origem" class="text-xs text-gray-400">· {{ r.origem }}</span>
                    </div>
                  </div>

                  <p
                    class="text-sm font-semibold flex-shrink-0"
                    :class="r.tipo === 'receita' ? 'text-emerald-900 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-100'"
                  >
                    {{ r.tipo === 'receita' ? '+' : '' }}{{ format(r.valor) }}
                  </p>
                </div>
              </template>

              <!-- Sem resultados -->
              <div v-else-if="debouncedQuery.length >= 2 && !pending" class="py-12 flex flex-col items-center gap-2 text-center">
                <UIcon name="i-heroicons-magnifying-glass" class="w-7 h-7 text-gray-300 dark:text-gray-600" />
                <p class="text-sm text-gray-500">Nenhuma transação encontrada</p>
                <p class="text-xs text-gray-400">para "{{ debouncedQuery }}"</p>
              </div>

              <!-- Estado inicial -->
              <div v-else-if="!query" class="py-10 flex flex-col items-center gap-1.5 text-center">
                <p class="text-sm text-gray-400">Digite para buscar em todas as transações</p>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()

const { format } = useCurrency()

const inputRef = ref<HTMLInputElement | null>(null)
const query = ref('')
const debouncedQuery = ref('')

let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(query, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { debouncedQuery.value = val }, 300)
})

watch(() => props.open, (val) => {
  if (val) {
    query.value = ''
    debouncedQuery.value = ''
    nextTick(() => inputRef.value?.focus())
  }
})

const { data, pending } = useFetch('/api/search', {
  query: computed(() => ({ q: debouncedQuery.value })),
  watch: [debouncedQuery],
})

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function highlight(text: string) {
  if (!debouncedQuery.value || debouncedQuery.value.length < 2) return text
  const escaped = debouncedQuery.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(
    new RegExp(`(${escaped})`, 'gi'),
    '<mark class="bg-yellow-100 dark:bg-yellow-900/40 text-inherit rounded px-0.5">$1</mark>'
  )
}
</script>
