<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
useHead({
  link: [
    { rel: 'stylesheet', href: 'https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400&display=swap' }
  ]
})
</script>
