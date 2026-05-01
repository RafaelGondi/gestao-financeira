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
      <UInput v-model="form.valorStr" placeholder="0,00" @blur="parseValor" class="w-full">
        <template #leading>
          <span class="text-gray-400 text-sm">R$</span>
        </template>
      </UInput>
    </UFormField>

    <UFormField label="Categoria">
      <UInput v-model="form.categoria" placeholder="Ex: Salário, Investimento..." class="w-full" />
    </UFormField>

    <!-- Tipo: Avulsa ou Fixa -->
    <UFormField label="Tipo de receita">
      <div class="flex gap-3">
        <button
          type="button"
          class="flex-1 flex items-center gap-3 p-3 rounded-lg border-2 transition-colors"
          :class="!form.fixa
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'"
          @click="form.fixa = false"
        >
          <UIcon name="i-heroicons-calendar-days" class="w-5 h-5"
            :class="!form.fixa ? 'text-primary-500' : 'text-gray-400'" />
          <div class="text-left">
            <p class="text-sm font-medium" :class="!form.fixa ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'">Avulsa</p>
            <p class="text-xs text-gray-400">Ocorre uma única vez</p>
          </div>
        </button>
        <button
          type="button"
          class="flex-1 flex items-center gap-3 p-3 rounded-lg border-2 transition-colors"
          :class="form.fixa
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'"
          @click="form.fixa = true"
        >
          <UIcon name="i-heroicons-arrow-path" class="w-5 h-5"
            :class="form.fixa ? 'text-primary-500' : 'text-gray-400'" />
          <div class="text-left">
            <p class="text-sm font-medium" :class="form.fixa ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'">Fixa</p>
            <p class="text-xs text-gray-400">Repete todo mês</p>
          </div>
        </button>
      </div>
    </UFormField>

    <!-- Avulsa: data única -->
    <template v-if="!form.fixa">
      <UFormField label="Data prevista de recebimento" required>
        <UInput v-model="form.data" type="date" class="w-full" />
      </UFormField>

      <div v-if="form.data" class="flex items-center gap-2 p-3 rounded-lg"
        :class="isRecebida ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'">
        <UIcon :name="isRecebida ? 'i-heroicons-check-circle' : 'i-heroicons-clock'" class="w-5 h-5"
          :class="isRecebida ? 'text-green-600' : 'text-yellow-600'" />
        <span class="text-sm font-medium"
          :class="isRecebida ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'">
          {{ isRecebida ? 'Já recebido (data no passado ou hoje)' : 'A receber em ' + fmtDate(form.data) }}
        </span>
      </div>
    </template>

    <!-- Fixa: data início + fim opcional -->
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
      <UButton type="button" variant="ghost" color="neutral" @click="emit('cancel')">
        Cancelar
      </UButton>
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
  fixa: boolean
  data?: string
  data_inicio?: string
  data_fim?: string
}

interface ReceitaFormData extends ReceitaInput {
  id?: number
}

const props = defineProps<{
  initial?: ReceitaFormData | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: ReceitaInput]
  cancel: []
}>()

const isEdit = computed(() => !!props.initial?.id)
const today = new Date().toISOString().split('T')[0]

const { data: contas } = await useFetch<{ id: number; nome: string; banco: string }[]>('/api/contas')
const contaOptions = computed(() =>
  (contas.value ?? []).map(c => ({ value: c.id, label: `${c.nome} — ${c.banco}` }))
)

const form = reactive({
  descricao: '',
  valor: 0,
  valorStr: '',
  categoria: '',
  conta_id: null as number | null,
  fixa: false,
  data: today,
  data_inicio: today,
  data_fim: ''
})

watch(() => props.initial, (val) => {
  if (val) {
    form.descricao = val.descricao
    form.valor = val.valor
    form.valorStr = String(val.valor).replace('.', ',')
    form.categoria = val.categoria ?? ''
    form.conta_id = val.conta_id ?? null
    form.fixa = Boolean(val.fixa)
    form.data = val.data ?? today
    form.data_inicio = val.data_inicio ?? today
    form.data_fim = val.data_fim ?? ''
  } else {
    form.descricao = ''
    form.valor = 0
    form.valorStr = ''
    form.categoria = ''
    form.conta_id = null
    form.fixa = false
    form.data = today
    form.data_inicio = today
    form.data_fim = ''
  }
}, { immediate: true })

const isRecebida = computed(() => !!form.data && form.data <= today)
const diaInicio = computed(() => form.data_inicio?.split('-')[2] ?? '')

function fmtDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function parseValor() {
  const cleaned = form.valorStr.replace(/\./g, '').replace(',', '.')
  const val = parseFloat(cleaned)
  form.valor = isNaN(val) ? 0 : val
}

function handleSubmit() {
  parseValor()
  if (!form.descricao.trim() || form.valor <= 0 || !form.conta_id) return

  const base = {
    descricao: form.descricao.trim(),
    valor: form.valor,
    categoria: form.categoria.trim() || undefined,
    conta_id: form.conta_id
  }

  if (form.fixa) {
    if (!form.data_inicio) return
    emit('submit', { ...base, fixa: true, data_inicio: form.data_inicio, data_fim: form.data_fim || undefined })
  } else {
    if (!form.data) return
    emit('submit', { ...base, fixa: false, data: form.data })
  }
}
</script>
