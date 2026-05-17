<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Top Navigation Bar -->
    <header class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <NuxtLink to="/" class="flex items-center gap-3">
            <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <UIcon name="i-heroicons-banknotes" class="w-5 h-5 text-white" />
            </div>
            <span class="text-lg font-bold text-gray-900 dark:text-white">Controle Financeiro</span>
          </NuxtLink>

          <!-- Navigation Links — desktop only -->
          <nav class="hidden lg:flex items-center gap-1">
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

            <!-- Dropdown: Movimentações -->
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
                <div v-if="movOpen" class="absolute left-0 top-full pt-1 w-48 z-50">
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
              v-for="link in navLinksMid"
              :key="link.to"
              :to="link.to"
              :variant="isActive(link.to) ? 'soft' : 'ghost'"
              :color="isActive(link.to) ? 'primary' : 'neutral'"
              :leading-icon="link.icon"
              size="sm"
            >
              {{ link.label }}
            </UButton>

            <!-- Dropdown: Análises -->
            <div class="relative" @mouseenter="analisesOpen = true" @mouseleave="analisesOpen = false">
              <UButton
                :variant="isAnalisesActive ? 'soft' : 'ghost'"
                :color="isAnalisesActive ? 'primary' : 'neutral'"
                leading-icon="i-heroicons-chart-pie"
                trailing-icon="i-heroicons-chevron-down"
                size="sm"
              >
                Análises
              </UButton>

              <Transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-1"
              >
                <div v-if="analisesOpen" class="absolute left-0 top-full pt-1 w-44 z-50">
                  <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden py-1">
                    <NuxtLink
                      v-for="item in analisesLinks"
                      :key="item.to"
                      :to="item.to"
                      class="flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                      :class="isActive(item.to)
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'"
                      @click="analisesOpen = false"
                    >
                      <UIcon :name="item.icon" class="w-4 h-4 flex-shrink-0" />
                      {{ item.label }}
                    </NuxtLink>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Dropdown: Planejamento -->
            <div class="relative" @mouseenter="planejamentoOpen = true" @mouseleave="planejamentoOpen = false">
              <UButton
                :variant="isPlanejamentoActive ? 'soft' : 'ghost'"
                :color="isPlanejamentoActive ? 'primary' : 'neutral'"
                leading-icon="i-heroicons-flag"
                trailing-icon="i-heroicons-chevron-down"
                size="sm"
              >
                Planejamento
              </UButton>

              <Transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-1"
              >
                <div v-if="planejamentoOpen" class="absolute left-0 top-full pt-1 w-44 z-50">
                  <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden py-1">
                    <NuxtLink
                      v-for="item in planejamentoLinks"
                      :key="item.to"
                      :to="item.to"
                      class="flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                      :class="isActive(item.to)
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'"
                      @click="planejamentoOpen = false"
                    >
                      <UIcon :name="item.icon" class="w-4 h-4 flex-shrink-0" />
                      {{ item.label }}
                    </NuxtLink>
                  </div>
                </div>
              </Transition>
            </div>
          </nav>

          <!-- Right: Search + Theme + Hamburger (mobile) -->
          <div class="flex items-center gap-2">
            <button
              class="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
              @click="searchOpen = true"
            >
              <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4" />
              <span class="hidden sm:inline text-xs">Buscar</span>
              <kbd class="hidden sm:inline-flex items-center px-1 py-0.5 text-xs bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">/</kbd>
            </button>
            <UButton
              :icon="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="toggleDark"
            />
            <!-- Hamburger — mobile only -->
            <UButton
              icon="i-heroicons-bars-3"
              variant="ghost"
              color="neutral"
              size="sm"
              class="lg:hidden"
              @click="mobileMenuOpen = true"
            />
          </div>
        </div>
      </div>
    </header>

    <!-- Mobile Drawer -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity ease-out duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity ease-in duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="mobileMenuOpen" class="fixed inset-0 z-50 lg:hidden">
          <!-- Backdrop -->
          <div class="fixed inset-0 bg-black/40" @click="mobileMenuOpen = false" />

          <!-- Panel -->
          <Transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="-translate-x-full"
            enter-to-class="translate-x-0"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="translate-x-0"
            leave-to-class="-translate-x-full"
          >
            <div v-if="mobileMenuOpen" class="fixed inset-y-0 left-0 w-72 bg-white dark:bg-gray-900 shadow-xl flex flex-col">
              <!-- Header -->
              <div class="flex items-center justify-between px-4 h-16 border-b border-gray-100 dark:border-gray-800">
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
                    <UIcon name="i-heroicons-banknotes" class="w-4 h-4 text-white" />
                  </div>
                  <span class="text-base font-bold text-gray-900 dark:text-white">Controle Financeiro</span>
                </div>
                <UButton icon="i-heroicons-x-mark" variant="ghost" color="neutral" size="sm" @click="mobileMenuOpen = false" />
              </div>

              <!-- Nav links -->
              <nav class="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
                <!-- Dashboard + Contas -->
                <NuxtLink
                  v-for="link in navLinks"
                  :key="link.to"
                  :to="link.to"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  :class="isActive(link.to)
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'"
                  @click="mobileMenuOpen = false"
                >
                  <UIcon :name="link.icon" class="w-4 h-4 flex-shrink-0" />
                  {{ link.label }}
                </NuxtLink>

                <!-- Movimentações group -->
                <div class="pt-2 pb-1 px-3">
                  <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Movimentações</p>
                </div>
                <NuxtLink
                  v-for="item in movLinks"
                  :key="item.to"
                  :to="item.to"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  :class="isActive(item.to)
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'"
                  @click="mobileMenuOpen = false"
                >
                  <UIcon :name="item.icon" class="w-4 h-4 flex-shrink-0" />
                  {{ item.label }}
                </NuxtLink>

                <!-- Cartões + Categorias -->
                <div class="pt-2 pb-1 px-3">
                  <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Outros</p>
                </div>
                <NuxtLink
                  v-for="link in navLinksMid"
                  :key="link.to"
                  :to="link.to"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  :class="isActive(link.to)
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'"
                  @click="mobileMenuOpen = false"
                >
                  <UIcon :name="link.icon" class="w-4 h-4 flex-shrink-0" />
                  {{ link.label }}
                </NuxtLink>

                <!-- Análises group -->
                <div class="pt-2 pb-1 px-3">
                  <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Análises</p>
                </div>
                <NuxtLink
                  v-for="item in analisesLinks"
                  :key="item.to"
                  :to="item.to"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  :class="isActive(item.to)
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'"
                  @click="mobileMenuOpen = false"
                >
                  <UIcon :name="item.icon" class="w-4 h-4 flex-shrink-0" />
                  {{ item.label }}
                </NuxtLink>

                <!-- Planejamento group -->
                <div class="pt-2 pb-1 px-3">
                  <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Planejamento</p>
                </div>
                <NuxtLink
                  v-for="item in planejamentoLinks"
                  :key="item.to"
                  :to="item.to"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  :class="isActive(item.to)
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'"
                  @click="mobileMenuOpen = false"
                >
                  <UIcon :name="item.icon" class="w-4 h-4 flex-shrink-0" />
                  {{ item.label }}
                </NuxtLink>
              </nav>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <slot />
    </main>

    <SharedSearchModal :open="searchOpen" @close="searchOpen = false" />
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

const navLinksMid = [
  { to: '/cartoes', label: 'Cartões', icon: 'i-heroicons-credit-card' },
  { to: '/categorias', label: 'Categorias', icon: 'i-heroicons-tag' },
]

const movLinks = [
  { to: '/receitas', label: 'Receitas', icon: 'i-heroicons-banknotes' },
  { to: '/despesas', label: 'Despesas', icon: 'i-heroicons-arrow-trending-down' },
  { to: '/transferencias', label: 'Transferências', icon: 'i-heroicons-arrows-right-left' },
]

const analisesLinks = [
  { to: '/relatorios', label: 'Relatórios', icon: 'i-heroicons-chart-pie' },
  { to: '/calendario', label: 'Calendário', icon: 'i-heroicons-calendar-days' },
]

const planejamentoLinks = [
  { to: '/limites', label: 'Limites', icon: 'i-heroicons-chart-bar' },
  { to: '/metas', label: 'Metas', icon: 'i-heroicons-flag' },
]

const movOpen = ref(false)
const analisesOpen = ref(false)
const planejamentoOpen = ref(false)
const searchOpen = ref(false)
const mobileMenuOpen = ref(false)

// Fecha o menu mobile ao navegar
watch(() => route.path, () => { mobileMenuOpen.value = false })

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    searchOpen.value = true
    return
  }
  if (e.key === 'Escape') {
    mobileMenuOpen.value = false
    return
  }
  if (e.key === '/' && !searchOpen.value) {
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return
    e.preventDefault()
    searchOpen.value = true
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const isMovActive = computed(() => movLinks.some(l => route.path.startsWith(l.to)))
const isAnalisesActive = computed(() => analisesLinks.some(l => route.path.startsWith(l.to)))
const isPlanejamentoActive = computed(() => planejamentoLinks.some(l => route.path.startsWith(l.to)))

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>
