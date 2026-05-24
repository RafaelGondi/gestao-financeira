<template>
  <USelectMenu
    v-model="selected"
    :open="open"
    :items="items"
    :create-item="{ position: 'bottom', when: 'always' }"
    placeholder="Ex: AMZN*MKTP BR 7K9QP2..."
    :search-input="{ placeholder: 'Buscar ou digitar novo...' }"
    class="w-full"
    :ui="{ base: 'w-full' }"
    @update:open="open = $event"
    @update:model-value="onSelect"
    @create="onCreate"
  >
    <template v-if="selected" #trailing>
      <button
        type="button"
        class="flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        @click.stop="clear"
      >
        <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
      </button>
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue?: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const { data, refresh } = await useFetch<string[]>('/api/nomes-fatura', { lazy: true })

const items = computed(() => data.value ?? [])

const open = ref(false)
const selected = ref(props.modelValue || '')

watch(() => props.modelValue, (val) => {
  selected.value = val || ''
})

function onSelect(val: string) {
  emit('update:modelValue', val)
}

async function onCreate(val: string) {
  selected.value = val
  emit('update:modelValue', val)
  open.value = false
  await refresh()
}

function clear() {
  selected.value = ''
  emit('update:modelValue', '')
}
</script>
