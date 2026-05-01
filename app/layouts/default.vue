<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Top Navigation Bar -->
    <header class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <UIcon name="i-heroicons-banknotes" class="w-5 h-5 text-white" />
            </div>
            <span class="text-lg font-bold text-gray-900 dark:text-white">Controle Financeiro</span>
          </div>

          <!-- Navigation Links -->
          <nav class="flex items-center gap-1">
            <UButton
              v-for="link in navLinks"
              :key="link.to"
              :to="link.to"
              :variant="isActive(link.to) ? 'soft' : 'ghost'"
              :color="isActive(link.to) ? 'primary' : 'neutral'"
              :leading-icon="link.icon"
              size="sm"
            >
              {{ link.label }}
            </UButton>
          </nav>

          <!-- Theme Toggle -->
          <div class="flex items-center gap-2">
            <UButton
              :icon="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="toggleDark"
            />
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')

function toggleDark() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

const navLinks = [
  { to: '/', label: 'Dashboard', icon: 'i-heroicons-chart-bar' },
  { to: '/contas', label: 'Contas', icon: 'i-heroicons-building-library' },
  { to: '/receitas', label: 'Receitas', icon: 'i-heroicons-banknotes' },
  { to: '/despesas', label: 'Despesas', icon: 'i-heroicons-arrow-trending-down' },
  { to: '/cartoes', label: 'Cartões', icon: 'i-heroicons-credit-card' },
  { to: '/transferencias', label: 'Transferências', icon: 'i-heroicons-arrows-right-left' }
]

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>
