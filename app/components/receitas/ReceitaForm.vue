<template>
  <div class="space-y-4">
    <UFormField label="Conta de destino" required>
      <USelect
        v-model="form.conta_id"
        :items="contaOptions"
        value-key="value"
        label-key="label"
        placeholder="Selecione a conta..."
        class="w-full"
      />
      <p v-if="contaOptions.length === 0" class="text-xs text-orange-500 mt-1">
        Nenhuma conta cadastrada. <NuxtLink to="/contas" class="underline">Cadastre uma conta</NuxtLink> primeiro.
      </p>
    </UFormField>

    <UFormField label="Descrição" required>
      <UInput v-model="form.descricao" placeholder="Ex: Salário, Freelance..." class="w-full" />
    </UFormField>

    <UFormField label="Valor" required>
      <SharedCurrencyInput v-model="form.valor" />
    </UFormField>

    <UFormField label="Categoria">
      <UInput v-model="form.categoria" placeholder="Ex: Salário, Investimento..." class="w-full" />
    </UFormField>

    <!-- Tipo -->
    <UFormField label="Tipo de receita">
      <div class="flex gap-2">
        <button
          v-for="opt in tipoOpts"
          :key="opt.value"
          type="button"
          class="flex-1 flex items-center gap-2 p-3 rounded-lg border-2 transition-colors"
          :class="form.tipo === opt.value
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'"
          @click="form.tipo = opt.value"
        >
          <UIcon :name="opt.icon" class="w-5 h-5 flex-shrink-0"
            :class="form.tipo === opt.value ? 'text-primary-500' : 'text-gray-400'" />
          <div class="text-left">
            <p class="text-sm font-medium" :class="form.tipo === opt.value ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'">{{ opt.label }}</p>
            <p class="text-xs text-gray-400">{{ opt.desc }}</p>
          </div>
        </button>
      </div>
    </UFormField>

    <!-- Avulsa -->
    <template v-if="form.tipo === 'avulsa'">
      <UFormField label="Data prevista de recebimento" required>
        <UInput v-model="form.data" type="date" class="w-full" />
      </UFormField>
      <div v-if="form.data" class="flex items-center gap-2 p-3 rounded-lg"
        :class="isRecebida ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'">
        <UIcon :name="isRecebida ? 'i-heroicons-check-circle' : 'i-heroicons-clock'" class="w-5 h-5"
          :class="isRecebida ? 'text-green-600' : 'text-yellow-600'" />
        <span class="text-sm font-medium" :class="isRecebida ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'">
          {{ isRecebida ? 'Já recebido (data no passado ou hoje)' : 'A receber em ' + fmtDate(form.data) }}
        </span>
      </div>
    </template>

    <!-- Parcelada -->
    <template v-else-if="form.tipo === 'parcelada'">
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Data da 1ª parcela" required>
          <UInput v-model="form.data_inicio" type="date" class="w-full" />
        </UFormField>
        <UFormField label="Número de parcelas" required>
          <UInput v-model.number="form.parcelas" type="number" min="2" max="360" placeholder="Ex: 12" class="w-full" />
        </UFormField>
      </div>
      <div v-if="form.data_inicio && form.parcelas >= 2" class="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
        <UIcon name="i-heroicons-queue-list" class="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <span class="text-sm font-medium text-purple-700 dark:text-purple-400">
          {{ form.parcelas }}x de {{ format(form.valor) }} · de {{ fmtDate(form.data_inicio) }} até {{ fmtDate(dataFimParcelada) }}
        </span>
      </div>
    </template>

    <!-- Fixa -->
    <template v-else>
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Data de início" required>
          <UInput v-model="form.data_inicio" type="date" class="w-full" />
        </UFormField>
        <UFormField label="Data de fim">
          <UInput v-model="form.data_fim" type="date" :min="form.data_inicio" class="w-full" />
        </UFormField>
      </div>
      <div v-if="form.data_inicio" class="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <span class="text-sm font-medium text-blue-700 dark:text-blue-400">
          Todo mês no dia {{ diaInicio }}{{ form.data_fim ? ' · até ' + fmtDate(form.data_fim) : ' (sem data de fim)' }}
        </span>
      </div>
    </template>

    <div class="flex justify-end gap-3 pt-2">
      <UButton type="button" variant="ghost" color="neutral" @click="emit('cancel')">Cancelar</UButton>
      <UButton :loading="loading" color="primary" @click="handleSubmit">
        {{ isEdit ? 'Salvar Alterações' : 'Adicionar Receita' }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ReceitaInput {
  descricao: string
  valor: number
  categoria?: string
  conta_id: number
  tipo: 'avulsa' | 'fixa' | 'parcelada'
  data?: string
  data_inicio?: string
  data_fim?: string
  parcelas?: number
}

interface ReceitaFormData extends ReceitaInput {
  id?: number
  fixa?: number
}

const props = defineProps<{
  initial?: ReceitaFormData | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: ReceitaInput]
  cancel: []
}>()

const { format } = useCurrency()
const isEdit = computed(() => !!props.initial?.id)
const today = new Date().toISOString().split('T')[0]

const tipoOpts = [
  { value: 'avulsa',    label: 'Avulsa',    icon: 'i-heroicons-calendar-days', desc: 'Uma única vez' },
  { value: 'parcelada', label: 'Parcelada', icon: 'i-heroicons-queue-list',    desc: 'X vezes' },
  { value: 'fixa',      label: 'Fixa',      icon: 'i-heroicons-arrow-path',    desc: 'Todo mês' },
] as const

const { data: contas } = await useFetch<{ id: number; nome: string; banco: string }[]>('/api/contas')
const contaOptions = computed(() =>
  (contas.value ?? []).map(c => ({ value: c.id, label: `${c.nome} — ${c.banco}` }))
)

function inferTipo(val: ReceitaFormData): 'avulsa' | 'fixa' | 'parcelada' {
  if (!val.fixa) return 'avulsa'
  if (val.parcelas && val.parcelas > 0) return 'parcelada'
  return 'fixa'
}

const form = reactive({
  descricao: '',
  valor: 0,
  categoria: '',
  conta_id: null as number | null,
  tipo: 'avulsa' as 'avulsa' | 'fixa' | 'parcelada',
  data: today,
  data_inicio: today,
  data_fim: '',
  parcelas: 2
})

watch(() => props.initial, (val) => {
  if (val) {
    form.descricao = val.descricao
    form.valor = val.valor
    form.categoria = val.categoria ?? ''
    form.conta_id = val.conta_id ?? null
    form.tipo = inferTipo(val)
    form.data = val.data ?? today
    form.data_inicio = val.data_inicio ?? today
    form.data_fim = val.data_fim ?? ''
    form.parcelas = val.parcelas && val.parcelas > 0 ? val.parcelas : 2
  } else {
    form.descricao = ''
    form.valor = 0
    form.categoria = ''
    form.conta_id = null
    form.tipo = 'avulsa'
    form.data = today
    form.data_inicio = today
    form.data_fim = ''
    form.parcelas = 2
  }
}, { immediate: true })

const isRecebida = computed(() => !!form.data && form.data <= today)
const diaInicio = computed(() => form.data_inicio?.split('-')[2] ?? '')

const dataFimParcelada = computed(() => {
  if (!form.data_inicio || form.parcelas < 2) return ''
  const [y, m, d] = form.data_inicio.split('-').map(Number)
  const total = m - 1 + form.parcelas - 1
  const ny = y + Math.floor(total / 12)
  const nm = (total % 12) + 1
  const lastDay = new Date(ny, nm, 0).getDate()
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`
})

function fmtDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function handleSubmit() {
  if (!form.descricao.trim() || form.valor <= 0 || !form.conta_id) return

  const base = {
    descricao: form.descricao.trim(),
    valor: Number(form.valor),
    categoria: form.categoria.trim() || undefined,
    conta_id: form.conta_id,
    tipo: form.tipo
  }

  if (form.tipo === 'parcelada') {
    if (!form.data_inicio || form.parcelas < 2) return
    emit('submit', { ...base, data_inicio: form.data_inicio, parcelas: form.parcelas })
  } else if (form.tipo === 'fixa') {
    if (!form.data_inicio) return
    emit('submit', { ...base, data_inicio: form.data_inicio, data_fim: form.data_fim || undefined })
  } else {
    if (!form.data) return
    emit('submit', { ...base, data: form.data })
  }
}
</script>
