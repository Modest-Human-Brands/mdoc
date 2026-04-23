<script setup lang="ts">
import Quotation_v1 from '~/components/template/quotation_v1.vue'

const route = useRoute()

const data = computed(() => {
  try {
    const encoded = route.query.payload as string
    return JSON.parse(atob(encoded))
  } catch {
    return undefined
  }
})
</script>

<template>
  <div>
    <Quotation_v1 v-if="route.params.template === 'quotation'" :data="data" />
  </div>
</template>
