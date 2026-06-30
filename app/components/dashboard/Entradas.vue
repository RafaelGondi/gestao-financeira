<template>
  <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <UIcon name="i-heroicons-arrow-down-circle" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
        <h3 class="font-semibold text-gray-800 dark:text-gray-100">Entradas</h3>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
          @click="sortAsc = !sortAsc"
        >
          <UIcon :name="sortAsc ? 'i-heroicons-bars-arrow-up' : 'i-heroicons-bars-arrow-down'" class="w-3.5 h-3.5" />
          {{ sortAsc ? 'mais antigo' : 'mais recente' }}
        </button>
        <span class="text-xs font-medium text-gray-400">{{ items.length }} item{{ items.length !== 1 ? 's' : '' }}</span>
      </div>
    </div>

    <!-- Lista -->
    <div class="flex-1">
      <div v-if="items.length === 0" class="text-center py-8 text-gray-400 text-sm">
        Nenhuma receita neste mês
      </div>

      <template v-for="grupo in grupos" :key="grupo.label">
        <!-- Linhas do grupo -->
        <div
          v-for="item in grupo.items"
          :key="`${item.id}-${item.fixa}`"
          class="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 transition-colors"
          :class="[
            item.pago ? 'opacity-60' : '',
            item.data === tomorrow && !item.pago ? 'bg-emerald-50/20 dark:bg-emerald-900/10' : ''
          ]"
        >
          <!-- Ícone categoria -->
          <div
            class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            :style="item.categoria_icone ? { background: item.categoria_cor } : {}"
            :class="!item.categoria_icone ? 'bg-gray-100 dark:bg-gray-800' : ''"
          >
            <UIcon
              :name="item.categoria_icone ?? 'i-heroicons-arrow-trending-up'"
              class="w-4 h-4"
              :class="item.categoria_icone ? 'text-white' : 'text-gray-400'"
            />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <p
                class="text-sm font-medium truncate"
                :class="item.data === tomorrow && !item.pago ? 'text-emerald-800 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-100'"
              >{{ item.descricao }}</p>
              <span
                v-if="item.data === tomorrow && !item.pago"
                class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-300 leading-none flex-shrink-0"
              >amanhã</span>
            </div>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="text-xs text-gray-400">{{ formatDate(item.data) }}</span>
              <template v-if="item.categoria">
                <span class="text-gray-300 dark:text-gray-700">·</span>
                <span class="text-xs text-gray-400">{{ item.categoria }}</span>
              </template>
            </div>
          </div>

          <!-- Valor + status -->
          <div class="flex items-center gap-2.5 flex-shrink-0">
            <span
              class="text-sm font-medium"
              :class="item.data === tomorrow && !item.pago ? 'text-emerald-800 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-100'"
            >{{ format(item.valor) }}</span>
            <span
              class="text-xs px-2 py-0.5 rounded-full"
              :class="entradaStatus(item).class"
            >
              {{ entradaStatus(item).label }}
            </span>
          </div>
        </div>

        <!-- Subtotal do grupo (só quando há mais de um grupo) -->
        <div v-if="grupos.length > 1" class="px-5 py-1.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30">
          <span class="text-[11px] text-gray-400 dark:text-gray-500">{{ grupo.label }}</span>
          <span class="text-[11px] font-medium text-gray-400 dark:text-gray-500">{{ format(grupo.subtotal) }}</span>
        </div>
      </template>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800">
      <span class="text-sm text-gray-500">Total do mês</span>
      <span class="text-base font-semibold text-green-800 dark:text-green-400">{{ format(total) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Item {
  id: number
  descricao: string
  valor: number
  data: string
  pago: number
  fixa: number
  categoria: string | null
  categoria_icone: string | null
  categoria_cor: string | null
}

interface Grupo {
  label: string
  items: Item[]
  subtotal: number
}

const props = defineProps<{ total: number; items: Item[] }>()

const { format } = useCurrency()

const { localDateStr, localTomorrow } = useLocalDate()
const today = localDateStr()
const tomorrow = localTomorrow()

const sortAsc = ref(true)

const sorted = computed(() =>
  [...props.items].sort((a, b) =>
    sortAsc.value ? a.data.localeCompare(b.data) : b.data.localeCompare(a.data)
  )
)

const grupos = computed<Grupo[]>(() => {
  const result: Grupo[] = []
  const soma = (ls: Item[]) => ls.reduce((s, i) => s + i.valor, 0)

  const recebidos = sorted.value.filter(i => i.pago)
  const atraso    = sorted.value.filter(i => !i.pago && i.data < today)
  const hoje      = sorted.value.filter(i => !i.pago && i.data === today)
  const amanha    = sorted.value.filter(i => !i.pago && i.data === tomorrow)
  const aReceber  = sorted.value.filter(i => !i.pago && i.data > tomorrow)

  if (recebidos.length) result.push({ label: 'recebidos',   items: recebidos, subtotal: soma(recebidos) })
  if (atraso.length)    result.push({ label: 'em atraso',   items: atraso,    subtotal: soma(atraso) })
  if (hoje.length)      result.push({ label: 'hoje',        items: hoje,      subtotal: soma(hoje) })
  if (amanha.length)    result.push({ label: 'amanhã',      items: amanha,    subtotal: soma(amanha) })
  if (aReceber.length)  result.push({ label: 'a receber',   items: aReceber,  subtotal: soma(aReceber) })

  return sortAsc.value ? result : result.reverse()
})

function entradaStatus(item: Item) {
  if (item.pago) {
    return {
      label: 'Recebido',
      class: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    }
  }
  if (item.data < today) {
    return {
      label: 'Em atraso',
      class: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
    }
  }
  return {
    label: 'A receber',
    class: 'bg-gray-100 dark:bg-gray-800 text-gray-500',
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR')
}
</script>
