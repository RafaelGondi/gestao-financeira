<template>
  <div class="space-y-4">
    <!-- Seletor de banco -->
    <UFormField label="Banco / Emissor" required>
      <div class="grid grid-cols-4 gap-2 mb-2">
        <button
          v-for="bank in BANKS"
          :key="bank.key"
          type="button"
          class="flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all"
          :class="form.bancoKey === bank.key
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
          @click="selectBank(bank)"
        >
          <SharedBankLogo :bank="bank" :size="36" class="rounded-lg" />
          <span class="text-xs text-center leading-tight"
            :class="form.bancoKey === bank.key
              ? 'text-primary-700 dark:text-primary-400 font-medium'
              : 'text-gray-500 dark:text-gray-400'">
            {{ bank.name }}
          </span>
        </button>
      </div>

      <div v-if="form.bancoKey === 'outro' || !form.bancoKey" class="mt-2">
        <UInput v-model="form.bancoCustom" placeholder="Nome do banco / emissor..." class="w-full" />
      </div>
    </UFormField>

    <!-- Cor do cartão -->
    <UFormField label="Cor do Cartão">
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Opção: usar cor do banco -->
        <button
          type="button"
          class="flex flex-col items-center gap-1 group"
          @click="form.cor = null"
        >
          <div
            class="w-9 h-6 rounded-md border-2 transition-all flex items-center justify-center"
            :class="form.cor === null
              ? 'border-primary-500 ring-2 ring-primary-300 dark:ring-primary-700'
              : 'border-gray-200 dark:border-gray-700'"
            :style="bankColorStyle"
          >
            <UIcon v-if="form.cor === null" name="i-heroicons-check" class="w-3 h-3 text-white drop-shadow" />
          </div>
          <span class="text-[10px] text-gray-400">Banco</span>
        </button>

        <!-- Swatches de cor -->
        <button
          v-for="preset in colorPresets"
          :key="preset.value"
          type="button"
          class="flex flex-col items-center gap-1 group"
          @click="form.cor = preset.value"
        >
          <div
            class="w-9 h-6 rounded-md border-2 transition-all flex items-center justify-center"
            :class="form.cor === preset.value
              ? 'border-primary-500 ring-2 ring-primary-300 dark:ring-primary-700'
              : 'border-transparent'"
            :style="{ background: preset.gradient }"
          >
            <UIcon v-if="form.cor === preset.value" name="i-heroicons-check" class="w-3 h-3 text-white drop-shadow" />
          </div>
          <span class="text-[10px] text-gray-400">{{ preset.label }}</span>
        </button>
      </div>

      <!-- Preview do cartão -->
      <div
        class="mt-3 h-14 rounded-lg flex items-center px-4 gap-3"
        :style="previewStyle"
      >
        <SharedBankLogo :bank="selectedBank" :size="28" class="rounded-md opacity-90 flex-shrink-0" />
        <div>
          <p class="text-white/70 text-[10px]">{{ selectedBankName }}</p>
          <p class="text-white text-sm font-bold">{{ form.nome || 'Nome do Cartão' }}</p>
        </div>
      </div>
    </UFormField>

    <UFormField label="Nome do Cartão" required>
      <UInput v-model="form.nome" placeholder="Ex: Uniclass, Visa Infinity, Platinum..." class="w-full" />
    </UFormField>

    <UFormField label="Limite" required>
      <SharedCurrencyInput v-model="form.limite" />
    </UFormField>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Melhor data p/ compra" required>
        <UInput v-model.number="form.melhor_data_compra" type="number" :min="1" :max="31" placeholder="Dia (1-31)" class="w-full" />
      </UFormField>
      <UFormField label="Vencimento" required>
        <UInput v-model.number="form.vencimento" type="number" :min="1" :max="31" placeholder="Dia (1-31)" class="w-full" />
      </UFormField>
    </div>

    <div class="flex justify-end gap-3 pt-2">
      <UButton type="button" variant="ghost" color="neutral" @click="emit('cancel')">Cancelar</UButton>
      <UButton :loading="loading" color="primary" @click="handleSubmit">
        {{ isEdit ? 'Salvar Alterações' : 'Adicionar Cartão' }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Bank } from '~/composables/useBanks'

interface CartaoInput {
  nome: string
  banco: string
  banco_key: string
  limite: number
  melhor_data_compra: number
  vencimento: number
  cor: string | null
}

interface CartaoFormData extends CartaoInput {
  id?: number
}

const props = defineProps<{
  initial?: CartaoFormData | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CartaoInput]
  cancel: []
}>()

const { BANKS, findBank } = useBanks()
const isEdit = computed(() => !!props.initial?.id)

const colorPresets = [
  { label: 'Preto',    value: '#111827', gradient: 'linear-gradient(135deg, #1f2937ee, #111827cc)' },
  { label: 'Azul',    value: '#1D4ED8', gradient: 'linear-gradient(135deg, #2563ebee, #1D4ED8cc)' },
  { label: 'Prata',   value: '#64748B', gradient: 'linear-gradient(135deg, #94a3b8ee, #64748Bcc)' },
  { label: 'Roxo',    value: '#6D28D9', gradient: 'linear-gradient(135deg, #7c3aedee, #6D28D9cc)' },
  { label: 'Verde',   value: '#065F46', gradient: 'linear-gradient(135deg, #059669ee, #065F46cc)' },
  { label: 'Dourado', value: '#92400E', gradient: 'linear-gradient(135deg, #D97706ee, #92400Ecc)' },
]

const form = reactive({
  nome: '',
  bancoKey: '',
  bancoCustom: '',
  limite: 0,
  melhor_data_compra: 1,
  vencimento: 1,
  cor: null as string | null,
})

watch(() => props.initial, (val) => {
  if (val) {
    form.nome = val.nome
    form.bancoKey = val.banco_key ?? ''
    form.bancoCustom = val.banco_key ? '' : val.banco
    form.limite = val.limite
    form.melhor_data_compra = val.melhor_data_compra
    form.vencimento = val.vencimento
    form.cor = val.cor ?? null
  } else {
    form.nome = ''
    form.bancoKey = ''
    form.bancoCustom = ''
    form.limite = 0
    form.melhor_data_compra = 1
    form.vencimento = 1
    form.cor = null
  }
}, { immediate: true })

function selectBank(bank: Bank) {
  form.bancoKey = bank.key
  form.bancoCustom = ''
}

const selectedBank = computed(() => findBank(form.bancoKey))
const selectedBankName = computed(() =>
  form.bancoKey ? (selectedBank.value?.name ?? form.bancoKey) : form.bancoCustom || 'Banco'
)

const bankColor = computed(() => selectedBank.value?.color ?? '#6366f1')

const bankColorStyle = computed(() => ({
  background: `linear-gradient(135deg, ${bankColor.value}ee 0%, ${bankColor.value}99 100%)`
}))

const previewStyle = computed(() => {
  const color = form.cor ?? bankColor.value
  return { background: `linear-gradient(135deg, ${color}ee 0%, ${color}99 100%)` }
})

function handleSubmit() {
  const bancoNome = form.bancoKey
    ? (BANKS.find(b => b.key === form.bancoKey)?.name ?? form.bancoKey)
    : form.bancoCustom.trim()

  if (!form.nome.trim() || !bancoNome || form.limite <= 0) return

  emit('submit', {
    nome: form.nome.trim(),
    banco: bancoNome,
    banco_key: form.bancoKey || '',
    limite: Number(form.limite),
    melhor_data_compra: form.melhor_data_compra,
    vencimento: form.vencimento,
    cor: form.cor,
  })
}
</script>
