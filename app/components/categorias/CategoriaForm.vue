<template>
  <div class="space-y-5">
    <!-- Tipo -->
    <UFormField label="Tipo" required>
      <div class="flex gap-2">
        <button
          v-for="t in tipos"
          :key="t.value"
          type="button"
          class="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border-2 text-sm font-medium transition-all"
          :class="form.tipo === t.value
            ? `border-transparent text-white`
            : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'"
          :style="form.tipo === t.value ? { background: t.color } : {}"
          @click="form.tipo = t.value"
        >
          <UIcon :name="t.icon" class="w-4 h-4" />
          {{ t.label }}
        </button>
      </div>
    </UFormField>

    <!-- Nome -->
    <UFormField label="Nome" required>
      <UInput v-model="form.nome" placeholder="Ex: Alimentação, Salário, Aluguel..." class="w-full" />
    </UFormField>

    <!-- Cor -->
    <UFormField label="Cor">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="cor in cores"
          :key="cor.value"
          type="button"
          class="w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center"
          :class="form.cor === cor.value ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'"
          :style="{ background: cor.value }"
          :title="cor.label"
          @click="form.cor = cor.value"
        >
          <UIcon v-if="form.cor === cor.value" name="i-heroicons-check" class="w-3.5 h-3.5 text-white drop-shadow" />
        </button>
      </div>
    </UFormField>

    <!-- Ícone -->
    <UFormField label="Ícone">
      <div class="grid grid-cols-9 gap-1.5">
        <button
          v-for="ic in icones"
          :key="ic.value"
          type="button"
          class="w-9 h-9 rounded-lg flex items-center justify-center border-2 transition-all"
          :class="form.icone === ic.value
            ? 'border-transparent text-white'
            : 'border-gray-100 dark:border-gray-700 text-gray-500 hover:border-gray-300 dark:hover:border-gray-500'"
          :style="form.icone === ic.value ? { background: form.cor } : {}"
          :title="ic.label"
          @click="form.icone = ic.value"
        >
          <UIcon :name="ic.value" class="w-4 h-4" />
        </button>
      </div>
    </UFormField>

    <!-- Supercategoria -->
    <UFormField label="Supercategoria">
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-sm transition-all"
          :class="form.supercategoria_id === null
            ? 'border-gray-400 dark:border-gray-500 text-gray-600 dark:text-gray-300'
            : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300'"
          @click="form.supercategoria_id = null"
        >
          Nenhuma
        </button>
        <button
          v-for="sc in supercategorias"
          :key="sc.id"
          type="button"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all"
          :class="form.supercategoria_id === sc.id
            ? 'border-transparent text-white'
            : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'"
          :style="form.supercategoria_id === sc.id ? { background: sc.cor } : {}"
          @click="form.supercategoria_id = sc.id"
        >
          <UIcon :name="sc.icone" class="w-3.5 h-3.5" />
          {{ sc.nome }}
        </button>
      </div>
      <p v-if="!supercategorias?.length" class="text-xs text-gray-400 mt-1">Nenhuma supercategoria cadastrada ainda.</p>
    </UFormField>

    <!-- Preview -->
    <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
      <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" :style="{ background: form.cor }">
        <UIcon :name="form.icone" class="w-5 h-5 text-white" />
      </div>
      <div>
        <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">{{ form.nome || 'Nome da categoria' }}</p>
        <p class="text-xs text-gray-400">{{ tipos.find(t => t.value === form.tipo)?.label }}</p>
      </div>
    </div>

    <div class="flex justify-end gap-3 pt-1">
      <UButton type="button" variant="ghost" color="neutral" @click="emit('cancel')">Cancelar</UButton>
      <UButton :loading="loading" color="primary" @click="handleSubmit">
        {{ isEdit ? 'Salvar' : 'Criar Categoria' }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
interface CategoriaData {
  id?: number
  nome: string
  tipo: string
  cor: string
  icone: string
  supercategoria_id?: number | null
}

interface Supercategoria {
  id: number
  nome: string
  cor: string
  icone: string
}

const props = defineProps<{ initial?: CategoriaData | null; loading?: boolean }>()
const emit = defineEmits<{ submit: [data: Omit<CategoriaData, 'id'>]; cancel: [] }>()

const isEdit = computed(() => !!props.initial?.id)

const { data: supercategorias } = useFetch<Supercategoria[]>('/api/supercategorias')

const tipos = [
  { value: 'despesa',      label: 'Despesa',      icon: 'i-heroicons-arrow-trending-down', color: '#EF4444' },
  { value: 'receita',      label: 'Receita',      icon: 'i-heroicons-arrow-trending-up',   color: '#22C55E' },
  { value: 'transferencia',label: 'Transferência', icon: 'i-heroicons-arrows-right-left',   color: '#6366F1' },
]

const cores = [
  // Vermelhos
  { label: 'Vermelho',        value: '#EF4444' },
  { label: 'Vermelho escuro', value: '#B91C1C' },
  { label: 'Salmão',         value: '#F87171' },
  { label: 'Coral',          value: '#FF6B6B' },
  // Laranjas / Amarelos
  { label: 'Laranja',        value: '#F97316' },
  { label: 'Laranja escuro', value: '#C2410C' },
  { label: 'Âmbar',         value: '#F59E0B' },
  { label: 'Amarelo',        value: '#EAB308' },
  // Verdes
  { label: 'Lima',           value: '#84CC16' },
  { label: 'Verde claro',    value: '#22C55E' },
  { label: 'Esmeralda',      value: '#10B981' },
  { label: 'Verde escuro',   value: '#15803D' },
  { label: 'Verde musgo',    value: '#4D7C0F' },
  // Azuis / Ciano
  { label: 'Ciano',          value: '#06B6D4' },
  { label: 'Céu',            value: '#0EA5E9' },
  { label: 'Azul',           value: '#3B82F6' },
  { label: 'Azul escuro',    value: '#1D4ED8' },
  { label: 'Marinho',        value: '#1E3A8A' },
  // Roxos / Rosas
  { label: 'Indigo',         value: '#6366F1' },
  { label: 'Violeta',        value: '#7C3AED' },
  { label: 'Roxo',           value: '#A855F7' },
  { label: 'Fúcsia',         value: '#D946EF' },
  { label: 'Rosa',           value: '#EC4899' },
  { label: 'Rosa claro',     value: '#F472B6' },
  // Neutros
  { label: 'Marrom',         value: '#92400E' },
  { label: 'Caramelo',       value: '#B45309' },
  { label: 'Zinco',          value: '#52525B' },
  { label: 'Cinza',          value: '#6B7280' },
  { label: 'Ardósia',        value: '#475569' },
  { label: 'Pedra',          value: '#78716C' },
]

const icones = [
  { value: 'i-heroicons-tag',                label: 'Tag' },
  { value: 'i-heroicons-banknotes',          label: 'Dinheiro' },
  { value: 'i-heroicons-building-library',   label: 'Banco' },
  { value: 'i-heroicons-shopping-bag',       label: 'Compras' },
  { value: 'i-heroicons-shopping-cart',      label: 'Mercado' },
  { value: 'i-heroicons-home',               label: 'Casa' },
  { value: 'i-heroicons-truck',              label: 'Transporte' },
  { value: 'i-heroicons-heart',              label: 'Saúde' },
  { value: 'i-heroicons-academic-cap',       label: 'Educação' },
  { value: 'i-heroicons-device-phone-mobile',label: 'Telefone' },
  { value: 'i-heroicons-computer-desktop',   label: 'Tecnologia' },
  { value: 'i-heroicons-film',               label: 'Cinema' },
  { value: 'i-heroicons-musical-note',       label: 'Música' },
  { value: 'i-heroicons-globe-alt',          label: 'Viagem' },
  { value: 'i-heroicons-bolt',               label: 'Energia' },
  { value: 'i-heroicons-fire',               label: 'Urgente' },
  { value: 'i-heroicons-gift',               label: 'Presente' },
  { value: 'i-heroicons-star',               label: 'Favorito' },
  { value: 'i-heroicons-briefcase',          label: 'Trabalho' },
  { value: 'i-heroicons-cake',               label: 'Padaria' },
  { value: 'i-lucide-plane',                 label: 'Viagem' },
  { value: 'i-heroicons-scissors',           label: 'Beleza' },
  { value: 'i-heroicons-wrench-screwdriver', label: 'Manutenção' },
  { value: 'i-heroicons-paint-brush',        label: 'Arte' },
  { value: 'i-heroicons-currency-dollar',    label: 'Financeiro' },
  { value: 'i-heroicons-chart-bar',          label: 'Investimento' },
  { value: 'i-heroicons-credit-card',        label: 'Cartão' },
  { value: 'i-heroicons-receipt-percent',    label: 'Impostos' },
  { value: 'i-heroicons-building-office-2',  label: 'Empresa' },
  { value: 'i-heroicons-map-pin',            label: 'Local' },
  { value: 'i-heroicons-arrows-right-left',  label: 'Transferência' },
  { value: 'i-heroicons-arrow-trending-up',  label: 'Receita' },
  { value: 'i-heroicons-arrow-trending-down',label: 'Despesa' },
  { value: 'i-heroicons-sparkles',           label: 'Especial' },
  { value: 'i-heroicons-face-smile',         label: 'Lazer' },
  { value: 'i-heroicons-paper-airplane',     label: 'Assinatura' },
  { value: 'i-lucide-gamepad-2',             label: 'Games' },
  { value: 'i-lucide-paw-print',             label: 'Pet' },
  { value: 'i-lucide-pill',                  label: 'Remédio' },
  { value: 'i-lucide-utensils',              label: 'Restaurante' },
  { value: 'i-lucide-croissant',             label: 'Padaria' },
  { value: 'i-lucide-wheat',                 label: 'Pão' },
  { value: 'i-lucide-brain',                 label: 'Saúde Mental' },
  { value: 'i-lucide-car',                   label: 'Carro' },
  { value: 'i-lucide-fuel',                  label: 'Gasolina' },
  { value: 'i-lucide-app-window',            label: 'App' },
  { value: 'i-lucide-beer',                  label: 'Cerveja' },
  { value: 'i-lucide-biceps-flexed',         label: 'Academia' },
  { value: 'i-lucide-bus',                   label: 'Ônibus' },
  { value: 'i-lucide-brick-wall-shield',     label: 'Seguro' },
  { value: 'i-lucide-bot',                   label: 'IA / Bot' },
  { value: 'i-lucide-cross',                 label: 'Saúde' },
  { value: 'i-lucide-cup-soda',              label: 'Bebida' },
  { value: 'i-lucide-ferris-wheel',          label: 'Parque' },
  { value: 'i-lucide-piggy-bank',            label: 'Poupança' },
  { value: 'i-lucide-brush-cleaning',        label: 'Limpeza' },
  { value: 'i-lucide-refresh-ccw',           label: 'Recorrente' },
  { value: 'i-lucide-shirt',                 label: 'Roupa' },
  { value: 'i-lucide-sport-shoe',            label: 'Tênis' },
  { value: 'i-lucide-circle-parking',        label: 'Estacionamento' },
  { value: 'i-lucide-refrigerator',          label: 'Geladeira' },
  { value: 'i-lucide-handshake',             label: 'Parceria' },
  { value: 'i-lucide-banknote-arrow-down',   label: 'Entrada de dinheiro' },
  { value: 'i-lucide-banknote-arrow-up',     label: 'Saída de dinheiro' },
  { value: 'i-lucide-hand-coins',            label: 'Gorjeta / Pagamento' },
  { value: 'i-lucide-pizza',                label: 'Pizza' },
  { value: 'i-lucide-chef-hat',             label: 'Chef / Cozinha' },
  { value: 'i-lucide-popcorn',              label: 'Pipoca / Cinema' },
  { value: 'i-lucide-hand-platter',         label: 'Restaurante' },
  { value: 'i-lucide-coffee',               label: 'Café' },
]

const form = reactive({
  nome: '',
  tipo: 'despesa',
  cor: '#EF4444',
  icone: 'i-heroicons-tag',
  supercategoria_id: null as number | null,
})

watch(() => props.initial, (val) => {
  if (val) {
    form.nome = val.nome
    form.tipo = val.tipo
    form.cor = val.cor
    form.icone = val.icone
    form.supercategoria_id = val.supercategoria_id ?? null
  } else {
    form.nome = ''
    form.tipo = 'despesa'
    form.cor = '#EF4444'
    form.icone = 'i-heroicons-tag'
    form.supercategoria_id = null
  }
}, { immediate: true })

function handleSubmit() {
  if (!form.nome.trim()) return
  emit('submit', { nome: form.nome.trim(), tipo: form.tipo, cor: form.cor, icone: form.icone, supercategoria_id: form.supercategoria_id })
}
</script>
