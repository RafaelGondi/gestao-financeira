<template>
  <div
    class="flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0"
    :style="{ width: sizePx, height: sizePx }"
  >
    <img
      v-if="bank && !imgError"
      :src="`/api/logo/${bank.domain}`"
      :alt="bank.name"
      class="w-full h-full object-contain p-1 bg-white"
      @error="imgError = true"
    />
    <!-- Fallback: iniciais com cor do banco -->
    <div
      v-else
      class="w-full h-full flex items-center justify-center text-white font-bold"
      :style="{ backgroundColor: bank?.color ?? '#6B7280', fontSize: fontSizePx }"
    >
      {{ bank?.initials ?? '?' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Bank } from '~/composables/useBanks'

const props = defineProps<{
  bank?: Bank | null
  size?: number // px
}>()

const { logoUrl } = useBanks()

const imgError = ref(false)

watch(() => props.bank, () => { imgError.value = false })

const sizePx = computed(() => `${props.size ?? 40}px`)
const fontSizePx = computed(() => `${Math.round((props.size ?? 40) * 0.35)}px`)
</script>
