<template>
  <div class="space-y-4">
    <!-- Pago com -->
    <UFormField label="Pago com" required>
      <div class="flex gap-2">
        <button
          type="button"
          class="flex-1 flex items-center gap-2 p-3 rounded-lg border-2 transition-colors"
          :class="form.pagoCom === 'conta'
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'"
          @click="form.pagoCom = 'conta'"
        >
          <UIcon name="i-heroicons-building-library" class="w-5 h-5 flex-shrink-0"
            :class="form.pagoCom === 'conta' ? 'text-primary-500' : 'text-gray-400'" />
          <div class="text-left">
            <p class="text-sm font-medium" :class="form.pagoCom === 'conta' ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'">Conta bancária</p>
          </div>
        </button>
        <button
          type="button"
          class="flex-1 flex items-center gap-2 p-3 rounded-lg border-2 transition-colors"
          :class="form.pagoCom === 'cartao'
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'"
          @click="form.pagoCom = 'cartao'"
        >
          <UIcon name="i-heroicons-credit-card" class="w-5 h-5 flex-shrink-0"
            :class="form.pagoCom === 'cartao' ? 'text-primary-500' : 'text-gray-400'" />
          <div class="text-left">
            <p class="text-sm font-medium" :class="form.pagoCom === 'cartao' ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'">Cartão de crédito</p>
          </div>
        </button>
      </div>
    </UFormField>

    <!-- Conta ou Cartão -->
    <UFormField v-if="form.pagoCom === 'conta'" label="Conta de débito" required>
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

    <UFormField v-else label="Cartão de crédito" required>
      <USelect
        v-model="form.cartao_id"
        :items="cartaoOptions"
        value-key="value"
        label-key="label"
        placeholder="Selecione o cartão..."
        class="w-full"
      />
      <p v-if="cartaoOptions.length === 0" class="text-xs text-orange-500 mt-1">
        Nenhum cartão cadastrado. <NuxtLink to="/cartoes" class="underline">Cadastre um cartão</NuxtLink> primeiro.
      </p>
    </UFormField>

    <UFormField label="Descrição" required>
      <UInput v-model="form.descricao" placeholder="Ex: Aluguel, Supermercado..." class="w-full" />
    </UFormField>

    <UFormField label="Valor" required>
      <SharedCurrencyInput v-model="form.valor" />
    </UFormField>

    <UFormField label="Categoria">
      <UInput v-model="form.categoria" placeholder="Ex: Moradia, Alimentação..." class="w-full" />
    </UFormField>

    <!-- Tipo -->
    <UFormField label="Tipo de despesa">
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
      <UFormField label="Data prevista de pagamento" required>
        <UInput v-model="form.data" type="date" class="w-full" />
      </UFormField>
      <div v-if="form.data" class="flex items-center gap-2 p-3 rounded-lg"
        :class="isPago ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'">
        <UIcon :name="isPago ? 'i-heroicons-check-circle' : 'i-heroicons-clock'" class="w-5 h-5"
          :class="isPago ? 'text-green-600' : 'text-yellow-600'" />
        <span class="text-sm font-medium" :class="isPago ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'">
          {{ isPago ? 'Já pago (data no passado ou hoje)' : 'A pagar em ' + fmtDate(form.data) }}
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
        {{ isEdit ? 'Salvar Alterações' : 'Adicionar Despesa' }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
interface DespesaInput {
  descricao: string
  valor: number
  categoria?: string
  conta_id?: number | null
  cartao_id?: number | null
  tipo: 'avulsa' | 'fixa' | 'parcelada'
  data?: string
  data_inicio?: string
  data_fim?: string
  parcelas?: number
}

interface DespesaFormData extends DespesaInput {
  id?: number
  fixa?: number
}

const props = defineProps<{
  initial?: DespesaFormData | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: DespesaInput]
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
const { data: cartoes } = await useFetch<{ id: number; nome: string; banco: string }[]>('/api/cartoes')

const contaOptions = computed(() =>
  (contas.value ?? []).map(c => ({ value: c.id, label: `${c.nome} — ${c.banco}` }))
)
const cartaoOptions = computed(() =>
  (cartoes.value ?? []).map(c => ({ value: c.id, label: `${c.nome} — ${c.banco}` }))
)

function inferTipo(val: DespesaFormData): 'avulsa' | 'fixa' | 'parcelada' {
  if (!val.fixa) return 'avulsa'
  if (val.parcelas && val.parcelas > 0) return 'parcelada'
  return 'fixa'
}

const form = reactive({
  pagoCom: 'conta' as 'conta' | 'cartao',
  descricao: '',
  valor: 0,
  categoria: '',
  conta_id: null as number | null,
  cartao_id: null as number | null,
  tipo: 'avulsa' as 'avulsa' | 'fixa' | 'parcelada',
  data: today,
  data_inicio: today,
  data_fim: '',
  parcelas: 2
})

watch(() => props.initial, (val) => {
  if (val) {
    form.pagoCom = val.cartao_id ? 'cartao' : 'conta'
    form.descricao = val.descricao
    form.valor = val.valor
    form.categoria = val.categoria ?? ''
    form.conta_id = val.conta_id ?? null
    form.cartao_id = val.cartao_id ?? null
    form.tipo = inferTipo(val)
    form.data = val.data ?? today
    form.data_inicio = val.data_inicio ?? today
    form.data_fim = val.data_fim ?? ''
    form.parcelas = val.parcelas && val.parcelas > 0 ? val.parcelas : 2
  } else {
    form.pagoCom = 'conta'
    form.descricao = ''
    form.valor = 0
    form.categoria = ''
    form.conta_id = null
    form.cartao_id = null
    form.tipo = 'avulsa'
    form.data = today
    form.data_inicio = today
    form.data_fim = ''
    form.parcelas = 2
  }
}, { immediate: true })

const isPago = computed(() => !!form.data && form.data <= today)
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
  const pagamentoOk = form.pagoCom === 'conta' ? !!form.conta_id : !!form.cartao_id
  if (!form.descricao.trim() || form.valor <= 0 || !pagamentoOk) return

  const base: DespesaInput = {
    descricao: form.descricao.trim(),
    valor: Number(form.valor),
    categoria: form.categoria.trim() || undefined,
    conta_id: form.pagoCom === 'conta' ? form.conta_id : null,
    cartao_id: form.pagoCom === 'cartao' ? form.cartao_id : null,
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
