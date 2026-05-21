<template>
  <div class="space-y-4">
    <!-- Conta travada -->
    <div class="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <SharedBankLogo :bank="findBank(contaBancoKey)" :size="32" class="rounded-md flex-shrink-0" />
      <div class="min-w-0">
        <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ contaNome }}</p>
        <p class="text-xs text-gray-400">{{ descricaoConta }}</p>
      </div>
      <UIcon name="i-heroicons-lock-closed" class="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0 ml-auto" />
    </div>

    <!-- Conta destino (só transferência) -->
    <UFormField v-if="tipo === 'transferencia'" label="Conta de destino" required>
      <USelect
        v-model="form.conta_destino_id"
        :items="contasDestino"
        value-key="value"
        label-key="label"
        placeholder="Selecione a conta de destino..."
        class="w-full"
      />
    </UFormField>

    <!-- Descrição -->
    <UFormField v-if="tipo !== 'transferencia'" label="Descrição" required>
      <UInput v-model="form.descricao" :placeholder="tipo === 'receita' ? 'Ex: Salário, Freelance...' : 'Ex: Aluguel, Supermercado...'" class="w-full" />
    </UFormField>
    <UFormField v-else label="Descrição">
      <UInput v-model="form.descricao" placeholder="Ex: Reserva de emergência..." class="w-full" />
    </UFormField>

    <!-- Valor -->
    <UFormField label="Valor" required>
      <SharedCurrencyInput v-model="form.valor" />
    </UFormField>

    <!-- Categoria (não transferência) -->
    <UFormField v-if="tipo !== 'transferencia'" label="Categoria">
      <SharedCategoriaInput v-model="form.categoria" :tipo="tipo" />
    </UFormField>

    <!-- Nome na fatura (não transferência) -->
    <UFormField v-if="tipo !== 'transferencia'" label="Nome na fatura">
      <UInput v-model="form.nome_fatura" placeholder="Ex: AMZN*MKTP BR 7K9QP2..." class="w-full" />
    </UFormField>

    <!-- Notas (não transferência) -->
    <UFormField v-if="tipo !== 'transferencia'" label="Notas">
      <UTextarea v-model="form.notas" placeholder="Observações opcionais..." :rows="2" class="w-full" />
    </UFormField>

    <!-- Tipo de lançamento (não transferência) -->
    <UFormField v-if="tipo !== 'transferencia'" label="Tipo">
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
    <template v-if="tipo !== 'transferencia' && form.tipoLanc === 'avulsa'">
      <UFormField label="Data" required>
        <UInput v-model="form.data" type="date" class="w-full" />
      </UFormField>
      <div v-if="form.data" class="flex items-center gap-2 p-2.5 rounded-lg text-sm font-medium"
        :class="form.data <= today ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'">
        <UIcon :name="form.data <= today ? 'i-heroicons-check-circle' : 'i-heroicons-clock'" class="w-4 h-4" />
        {{ form.data <= today ? (tipo === 'receita' ? 'Já recebido' : 'Já pago') : (tipo === 'receita' ? 'A receber em ' : 'A pagar em ') + fmtDate(form.data) }}
      </div>
    </template>

    <!-- Parcelada -->
    <template v-else-if="tipo !== 'transferencia' && form.tipoLanc === 'parcelada'">
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
    <template v-else-if="tipo !== 'transferencia' && form.tipoLanc === 'fixa'">
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

    <!-- Transferência: data -->
    <UFormField v-if="tipo === 'transferencia'" label="Data" required>
      <UInput v-model="form.data" type="date" class="w-full" />
    </UFormField>

    <div class="flex gap-3 pt-4">
      <UButton variant="ghost" color="neutral" size="lg" class="flex-1 justify-center" @click="emit('cancel')">Cancelar</UButton>
      <UButton color="primary" :loading="loading" size="lg" class="flex-1 justify-center" @click="handleSubmit">
        {{ isEdit ? 'Salvar alterações' : tipo === 'receita' ? 'Adicionar receita' : tipo === 'despesa' ? 'Adicionar despesa' : 'Transferir' }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  contaId: number
  contaNome: string
  contaBanco: string
  contaBancoKey: string
  tipo: 'receita' | 'despesa' | 'transferencia'
  loading?: boolean
  initial?: {
    id?: number
    descricao?: string | null
    valor?: number
    categoria?: string | null
    notas?: string | null
    nome_fatura?: string | null
    fixa?: number
    parcelas?: number
    data?: string | null
    data_inicio?: string | null
    data_fim?: string | null
    conta_destino_id?: number | null
  } | null
}>()

const emit = defineEmits<{
  submit: [data: Record<string, any>]
  cancel: []
}>()

const { format } = useCurrency()
const { findBank } = useBanks()
const today = useLocalDate().localDateStr()

const isEdit = computed(() => !!props.initial?.id)

const tipoOpts = [
  { value: 'avulsa',    label: 'Avulsa',    icon: 'i-heroicons-calendar-days', desc: 'Uma vez' },
  { value: 'parcelada', label: 'Parcelada', icon: 'i-heroicons-queue-list',    desc: 'X vezes' },
  { value: 'fixa',      label: 'Fixa',      icon: 'i-heroicons-arrow-path',    desc: 'Todo mês' },
] as const

const descricaoConta = computed(() => {
  if (props.tipo === 'receita') return 'Conta de destino'
  if (props.tipo === 'despesa') return 'Conta de débito'
  return 'Conta de origem'
})

// Outras contas para transferência
const { data: todasContas } = await useFetch<{ id: number; nome: string; banco: string }[]>('/api/contas')
const contasDestino = computed(() =>
  (todasContas.value ?? [])
    .filter(c => c.id !== props.contaId)
    .map(c => ({ value: c.id, label: `${c.nome} — ${c.banco}` }))
)

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
  conta_destino_id: null as number | null,
})

// Pre-fill form when editing
watch(() => props.initial, (val) => {
  if (val?.id) {
    form.descricao = val.descricao ?? ''
    form.valor = val.valor ?? 0
    form.categoria = val.categoria ?? ''
    form.nome_fatura = val.nome_fatura ?? ''
    form.notas = val.notas ?? ''
    if (val.fixa && val.parcelas && val.parcelas > 0) {
      form.tipoLanc = 'parcelada'
      form.data_inicio = val.data_inicio ?? today
      form.parcelas = val.parcelas
    } else if (val.fixa) {
      form.tipoLanc = 'fixa'
      form.data_inicio = val.data_inicio ?? today
      form.data_fim = val.data_fim ?? ''
    } else {
      form.tipoLanc = 'avulsa'
      form.data = val.data ?? today
    }
    if (val.conta_destino_id) form.conta_destino_id = val.conta_destino_id
  }
}, { immediate: true })

// Reset form when tipo changes (only when not editing)
watch(() => props.tipo, () => {
  if (props.initial?.id) return
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
  form.conta_destino_id = null
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

function handleSubmit() {
  if (props.tipo === 'transferencia') {
    if (!form.conta_destino_id || form.valor <= 0 || !form.data) return
    emit('submit', {
      conta_origem_id: props.contaId,
      conta_destino_id: form.conta_destino_id,
      valor: Number(form.valor),
      data: form.data,
      descricao: form.descricao.trim() || undefined,
    })
    return
  }

  if (!form.descricao.trim() || form.valor <= 0) return

  const base = {
    descricao: form.descricao.trim(),
    valor: Number(form.valor),
    categoria: form.categoria.trim() || undefined,
    nome_fatura: form.nome_fatura.trim() || undefined,
    notas: form.notas.trim() || undefined,
    conta_id: props.contaId,
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
