<template>
  <div class="space-y-4">
    <!-- Cartão travado -->
    <div class="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <SharedBankLogo :bank="findBank(cartaoBancoKey)" :size="32" class="rounded-md flex-shrink-0" />
      <div class="min-w-0">
        <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ cartaoNome }}</p>
        <p class="text-xs text-gray-400">Cartão de crédito</p>
      </div>
      <UIcon name="i-heroicons-lock-closed" class="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0 ml-auto" />
    </div>

    <!-- Descrição -->
    <UFormField label="Descrição" required>
      <UInput v-model="form.descricao" placeholder="Ex: Supermercado, Netflix..." class="w-full" />
    </UFormField>

    <!-- Valor -->
    <UFormField label="Valor" required>
      <SharedCurrencyInput v-model="form.valor" />
    </UFormField>

    <!-- Categoria -->
    <UFormField label="Categoria">
      <SharedCategoriaInput v-model="form.categoria" tipo="despesa" />
    </UFormField>

    <!-- Nome na fatura -->
    <UFormField label="Nome na fatura">
      <UInput v-model="form.nome_fatura" placeholder="Ex: AMZN*MKTP BR 7K9QP2..." class="w-full" />
    </UFormField>

    <!-- Notas -->
    <UFormField label="Notas">
      <UTextarea v-model="form.notas" placeholder="Observações opcionais..." :rows="2" class="w-full" />
    </UFormField>

    <!-- Tipo -->
    <UFormField label="Tipo">
      <div class="flex gap-2">
        <button
          v-for="opt in tipoOpts"
          :key="opt.value"
          type="button"
          class="flex-1 flex items-center gap-2 p-2.5 rounded-lg border-2 transition-colors cursor-pointer"
          :class="form.tipoLanc === opt.value
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'"
          @click="form.tipoLanc = opt.value"
        >
          <UIcon :name="opt.icon" class="w-4 h-4 flex-shrink-0"
            :class="form.tipoLanc === opt.value ? 'text-primary-500' : 'text-gray-400'" />
          <div class="text-left">
            <p class="text-xs font-medium" :class="form.tipoLanc === opt.value ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'">{{ opt.label }}</p>
            <p class="text-xs text-gray-400">{{ opt.desc }}</p>
          </div>
        </button>
      </div>
    </UFormField>

    <!-- Avulsa: data -->
    <template v-if="form.tipoLanc === 'avulsa'">
      <UFormField label="Data" required>
        <UInput v-model="form.data" type="date" class="w-full" />
      </UFormField>
      <div v-if="form.data" class="flex items-center gap-2 p-2.5 rounded-lg text-sm font-medium"
        :class="form.data <= today ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'">
        <UIcon :name="form.data <= today ? 'i-heroicons-check-circle' : 'i-heroicons-clock'" class="w-4 h-4" />
        {{ form.data <= today ? 'Já pago' : 'A pagar em ' + fmtDate(form.data) }}
      </div>
    </template>

    <!-- Parcelada -->
    <template v-else-if="form.tipoLanc === 'parcelada'">
      <div class="grid grid-cols-2 gap-3">
        <UFormField label="Data da 1ª parcela" required>
          <UInput v-model="form.data_inicio" type="date" class="w-full" />
        </UFormField>
        <UFormField label="Nº de parcelas" required>
          <UInput v-model.number="form.parcelas" type="number" min="2" max="360" placeholder="Ex: 12" class="w-full" />
        </UFormField>
      </div>
      <div v-if="form.data_inicio && form.parcelas >= 2" class="flex items-center gap-2 p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm font-medium text-purple-700 dark:text-purple-400">
        <UIcon name="i-heroicons-queue-list" class="w-4 h-4" />
        {{ form.parcelas }}x de {{ format(form.valor) }} · até {{ fmtDate(dataFimParcelada) }}
      </div>
    </template>

    <!-- Fixa -->
    <template v-else>
      <div class="grid grid-cols-2 gap-3">
        <UFormField label="Data de início" required>
          <UInput v-model="form.data_inicio" type="date" class="w-full" />
        </UFormField>
        <UFormField label="Data de fim">
          <UInput v-model="form.data_fim" type="date" :min="form.data_inicio" class="w-full" />
        </UFormField>
      </div>
      <div v-if="form.data_inicio" class="flex items-center gap-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-400">
        <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
        Todo mês no dia {{ form.data_inicio.slice(8) }}{{ form.data_fim ? ' · até ' + fmtDate(form.data_fim) : '' }}
      </div>
    </template>

    <div class="flex justify-end gap-2 pt-1">
      <UButton variant="ghost" color="neutral" @click="emit('cancel')">Cancelar</UButton>
      <UButton color="primary" :loading="loading" @click="handleSubmit">
        {{ editMode ? 'Salvar alterações' : 'Adicionar despesa' }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
interface LancamentoInicial {
  id: number
  descricao: string
  valor: number
  data: string
  data_inicio: string | null
  data_fim: string | null
  fixa: number
  parcelas: number
  categoria: string | null
  notas?: string | null
  nome_fatura?: string | null
}

const props = defineProps<{
  cartaoId: number
  cartaoNome: string
  cartaoBancoKey: string
  loading?: boolean
  editMode?: boolean
}>()

const emit = defineEmits<{
  submit: [data: Record<string, any>]
  cancel: []
}>()

const { format } = useCurrency()
const { findBank } = useBanks()
const today = new Date().toISOString().split('T')[0]

const tipoOpts = [
  { value: 'avulsa',    label: 'Avulsa',    icon: 'i-heroicons-calendar-days', desc: 'Uma vez' },
  { value: 'parcelada', label: 'Parcelada', icon: 'i-heroicons-queue-list',    desc: 'X vezes' },
  { value: 'fixa',      label: 'Fixa',      icon: 'i-heroicons-arrow-path',    desc: 'Todo mês' },
] as const

const form = reactive({
  descricao: '',
  valor: 0,
  categoria: '',
  nome_fatura: '',
  notas: '',
  tipoLanc: 'avulsa' as 'avulsa' | 'fixa' | 'parcelada',
  data: today,
  data_inicio: today,
  data_fim: '',
  parcelas: 2,
})

const dataFimParcelada = computed(() => {
  if (!form.data_inicio || form.parcelas < 2) return ''
  const [y, m, d] = form.data_inicio.split('-').map(Number)
  const total = m - 1 + form.parcelas - 1
  const ny = y + Math.floor(total / 12)
  const nm = (total % 12) + 1
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, new Date(ny, nm, 0).getDate())).padStart(2, '0')}`
})

function fmtDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function resetForm() {
  form.descricao = ''
  form.valor = 0
  form.categoria = ''
  form.nome_fatura = ''
  form.notas = ''
  form.tipoLanc = 'avulsa'
  form.data = today
  form.data_inicio = today
  form.data_fim = ''
  form.parcelas = 2
}

function fillForm(lanc: LancamentoInicial) {
  form.descricao = lanc.descricao
  form.valor = lanc.valor
  form.categoria = lanc.categoria ?? ''
  form.nome_fatura = lanc.nome_fatura ?? ''
  form.notas = lanc.notas ?? ''
  if (!lanc.fixa) {
    form.tipoLanc = 'avulsa'
    form.data = lanc.data
  } else if (lanc.parcelas > 0) {
    form.tipoLanc = 'parcelada'
    form.data_inicio = lanc.data_inicio ?? today
    form.parcelas = lanc.parcelas
  } else {
    form.tipoLanc = 'fixa'
    form.data_inicio = lanc.data_inicio ?? today
    form.data_fim = lanc.data_fim ?? ''
  }
}

defineExpose({ resetForm, fillForm })

function handleSubmit() {
  if (!form.descricao.trim() || form.valor <= 0) return

  const base = {
    descricao: form.descricao.trim(),
    valor: Number(form.valor),
    categoria: form.categoria.trim() || undefined,
    nome_fatura: form.nome_fatura.trim() || undefined,
    notas: form.notas.trim() || undefined,
    cartao_id: props.cartaoId,
    tipo: form.tipoLanc,
  }

  if (form.tipoLanc === 'parcelada') {
    if (!form.data_inicio || form.parcelas < 2) return
    emit('submit', { ...base, data_inicio: form.data_inicio, parcelas: form.parcelas })
  } else if (form.tipoLanc === 'fixa') {
    if (!form.data_inicio) return
    emit('submit', { ...base, data_inicio: form.data_inicio, data_fim: form.data_fim || undefined })
  } else {
    if (!form.data) return
    emit('submit', { ...base, data: form.data })
  }
}
</script>
