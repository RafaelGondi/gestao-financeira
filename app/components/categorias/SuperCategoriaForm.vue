<template>
  <div class="space-y-5">
    <!-- Nome -->
    <UFormField label="Nome" required>
      <UInput v-model="form.nome" placeholder="Ex: Moradia, Alimentação, Renda..." class="w-full" />
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

    <!-- Preview -->
    <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
      <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" :style="{ background: form.cor }">
        <UIcon :name="form.icone" class="w-5 h-5 text-white" />
      </div>
      <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">{{ form.nome || 'Nome da supercategoria' }}</p>
    </div>

    <div class="flex justify-end gap-3 pt-1">
      <UButton type="button" variant="ghost" color="neutral" @click="emit('cancel')">Cancelar</UButton>
      <UButton :loading="loading" color="primary" @click="handleSubmit">
        {{ isEdit ? 'Salvar' : 'Criar Supercategoria' }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
interface SupercategoriaData {
  id?: number
  nome: string
  cor: string
  icone: string
}

const props = defineProps<{ initial?: SupercategoriaData | null; loading?: boolean }>()
const emit = defineEmits<{ submit: [data: Omit<SupercategoriaData, 'id'>]; cancel: [] }>()

const isEdit = computed(() => !!props.initial?.id)

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
  { value: 'i-heroicons-home',               label: 'Casa' },
  { value: 'i-heroicons-heart',              label: 'Saúde' },
  { value: 'i-heroicons-academic-cap',       label: 'Educação' },
  { value: 'i-heroicons-globe-alt',          label: 'Viagem' },
  { value: 'i-heroicons-briefcase',          label: 'Trabalho' },
  { value: 'i-heroicons-chart-bar',          label: 'Investimento' },
  { value: 'i-heroicons-currency-dollar',    label: 'Financeiro' },
  { value: 'i-heroicons-credit-card',        label: 'Cartão' },
  { value: 'i-heroicons-building-office-2',  label: 'Empresa' },
  { value: 'i-heroicons-shopping-bag',       label: 'Compras' },
  { value: 'i-heroicons-sparkles',           label: 'Especial' },
  { value: 'i-heroicons-star',               label: 'Favorito' },
  { value: 'i-heroicons-gift',               label: 'Presente' },
  { value: 'i-lucide-car',                   label: 'Carro' },
  { value: 'i-lucide-plane',                 label: 'Viagem' },
  { value: 'i-lucide-utensils',              label: 'Alimentação' },
  { value: 'i-lucide-piggy-bank',            label: 'Poupança' },
  { value: 'i-lucide-paw-print',             label: 'Pet' },
  { value: 'i-lucide-brain',                 label: 'Saúde Mental' },
  { value: 'i-lucide-cross',                 label: 'Saúde' },
  { value: 'i-lucide-gamepad-2',             label: 'Games' },
  { value: 'i-lucide-shield-check',          label: 'Seguro' },
  { value: 'i-lucide-refresh-ccw',           label: 'Recorrente' },
  { value: 'i-lucide-shirt',                 label: 'Roupa' },
  { value: 'i-lucide-sport-shoe',            label: 'Tênis' },
  { value: 'i-lucide-circle-parking',        label: 'Estacionamento' },
  { value: 'i-lucide-refrigerator',          label: 'Geladeira' },
  { value: 'i-lucide-handshake',             label: 'Parceria' },
  { value: 'i-lucide-banknote-arrow-down',   label: 'Entrada de dinheiro' },
  { value: 'i-lucide-banknote-arrow-up',     label: 'Saída de dinheiro' },
  { value: 'i-lucide-hand-coins',            label: 'Gorjeta / Pagamento' },
]

const form = reactive({
  nome: '',
  cor: '#6366F1',
  icone: 'i-heroicons-tag',
})

watch(() => props.initial, (val) => {
  if (val) {
    form.nome = val.nome
    form.cor = val.cor
    form.icone = val.icone
  } else {
    form.nome = ''
    form.cor = '#6366F1'
    form.icone = 'i-heroicons-tag'
  }
}, { immediate: true })

function handleSubmit() {
  if (!form.nome.trim()) return
  emit('submit', { nome: form.nome.trim(), cor: form.cor, icone: form.icone })
}
</script>
