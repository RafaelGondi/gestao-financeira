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

            <!-- Dropdown: Movimentações (após Contas) -->
            <div class="relative" @mouseenter="movOpen = true" @mouseleave="movOpen = false">
              <UButton
                :variant="isMovActive ? 'soft' : 'ghost'"
                :color="isMovActive ? 'primary' : 'neutral'"
                leading-icon="i-heroicons-arrows-right-left"
                trailing-icon="i-heroicons-chevron-down"
                size="sm"
              >
                Movimentações
              </UButton>

              <Transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-1"
              >
                <div
                  v-if="movOpen"
                  class="absolute left-0 top-full pt-1 w-48 z-50"
                >
                  <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden py-1">
                    <NuxtLink
                      v-for="item in movLinks"
                      :key="item.to"
                      :to="item.to"
                      class="flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                      :class="isActive(item.to)
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'"
                      @click="movOpen = false"
                    >
                      <UIcon :name="item.icon" class="w-4 h-4 flex-shrink-0" />
                      {{ item.label }}
                    </NuxtLink>
                  </div>
                </div>
              </Transition>
            </div>

            <UButton
              v-for="link in navLinksAfterMov"
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
]

const navLinksAfterMov = [
  { to: '/cartoes', label: 'Cartões', icon: 'i-heroicons-credit-card' },
  { to: '/categorias', label: 'Categorias', icon: 'i-heroicons-tag' },
  { to: '/relatorios', label: 'Relatórios', icon: 'i-heroicons-chart-pie' },
  { to: '/calendario', label: 'Calendário', icon: 'i-heroicons-calendar-days' },
  { to: '/limites', label: 'Limites', icon: 'i-heroicons-chart-bar' },
]

const movLinks = [
  { to: '/receitas', label: 'Receitas', icon: 'i-heroicons-banknotes' },
  { to: '/despesas', label: 'Despesas', icon: 'i-heroicons-arrow-trending-down' },
  { to: '/transferencias', label: 'Transferências', icon: 'i-heroicons-arrows-right-left' },
]

const movOpen = ref(false)

const isMovActive = computed(() =>
  movLinks.some(l => route.path.startsWith(l.to))
)

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>
