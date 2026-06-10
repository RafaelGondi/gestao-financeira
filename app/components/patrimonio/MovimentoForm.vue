<template>
  <div class="space-y-4">
    <div>
      <p class="text-xs text-gray-500 mb-1">Tipo</p>
      <select v-model="form.tipo"
        class="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer">
        <option value="ajuste">Ajuste de saldo</option>
        <option value="aporte">Crédito extra</option>
        <option value="retirada">Saque / retirada</option>
      </select>
    </div>

    <div v-if="form.tipo === 'aporte'">
      <p class="text-xs text-gray-500 mb-1">Conta de origem <span class="text-gray-400">(opcional)</span></p>
      <select v-model="form.conta_origem_id"
        class="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer">
        <option :value="null">Sem vínculo com conta</option>
        <option v-for="c in contas" :key="c.id" :value="c.id">{{ c.nome }} — {{ c.banco }}</option>
      </select>
      <p v-if="form.conta_origem_id" class="text-xs text-gray-400 mt-1">Debita a conta e credita este item.</p>
    </div>

    <div v-if="form.tipo === 'retirada'">
      <p class="text-xs text-gray-500 mb-1">Conta de destino <span class="text-gray-400">(opcional)</span></p>
      <select v-model="form.conta_destino_id"
        class="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer">
        <option :value="null">Sem vínculo com conta</option>
        <option v-for="c in contas" :key="c.id" :value="c.id">{{ c.nome }} — {{ c.banco }}</option>
      </select>
      <p v-if="form.conta_destino_id" class="text-xs text-gray-400 mt-1">Debita este item e credita a conta.</p>
    </div>

    <div>
      <p class="text-xs text-gray-500 mb-1">{{ form.tipo === 'ajuste' ? 'Novo saldo' : 'Valor' }}</p>
      <SharedCurrencyInput v-model="form.valor" />
    </div>

    <div>
      <p class="text-xs text-gray-500 mb-1">Data</p>
      <input v-model="form.data" type="date"
        class="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500" />
    </div>

    <div>
      <p class="text-xs text-gray-500 mb-1">Notas <span class="text-gray-400">(opcional)</span></p>
      <input v-model="form.notas" type="text" placeholder="Ex: lucro 2024, conferência app"
        class="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500" />
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <UButton color="neutral" variant="ghost" class="cursor-pointer" @click="emit('cancel')">Cancelar</UButton>
      <UButton color="primary" class="cursor-pointer" :loading="loading" @click="submit">Salvar</UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  patrimonioId: number
  saldoAtual: number
  aporteModo?: string
  contas: { id: number; nome: string; banco: string }[]
}>()

const emit = defineEmits<{
  saved: []
  cancel: []
}>()

const loading = ref(false)

const now = new Date()
const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

const form = reactive({
  tipo: 'ajuste' as 'ajuste' | 'aporte' | 'retirada',
  valor: 0,
  data: todayStr,
  notas: '',
  conta_origem_id: null as number | null,
  conta_destino_id: null as number | null,
})

function reset(defaultTipo?: 'ajuste' | 'aporte' | 'retirada') {
  form.tipo = defaultTipo ?? (props.aporteModo === 'manual' ? 'aporte' : 'ajuste')
  form.valor = form.tipo === 'ajuste' ? props.saldoAtual : 0
  form.data = todayStr
  form.notas = ''
  form.conta_origem_id = null
  form.conta_destino_id = null
}

async function submit() {
  if (!form.valor || form.valor <= 0 || !form.data) return
  loading.value = true
  try {
  if (form.tipo === 'retirada' && form.conta_destino_id) {
    await $fetch('/api/transferencias', {
      method: 'POST',
      body: {
        patrimonio_origem_id: props.patrimonioId,
        conta_destino_id: form.conta_destino_id,
        valor: form.valor,
        data: form.data,
        descricao: form.notas.trim() || undefined,
      },
    })
  } else if (form.tipo === 'aporte' && form.conta_origem_id) {
    await $fetch('/api/transferencias', {
      method: 'POST',
      body: {
        conta_origem_id: form.conta_origem_id,
        patrimonio_destino_id: props.patrimonioId,
        valor: form.valor,
        data: form.data,
        descricao: form.notas.trim() || undefined,
      },
    })
  } else {
    await $fetch(`/api/patrimonio/${props.patrimonioId}/movimentos`, {
      method: 'POST',
      body: { tipo: form.tipo, valor: form.valor, data: form.data, notas: form.notas || null },
    })
  }

  emit('saved')
  } finally {
    loading.value = false
  }
}

defineExpose({ reset })
</script>
