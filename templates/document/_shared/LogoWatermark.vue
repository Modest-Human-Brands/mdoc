<script setup lang="ts">
import { Image, View } from '@ceereals/vue-pdf'

defineProps<{ src?: string }>()

const position = { position: 'absolute', left: -65, bottom: -65, width: 180, height: 180 } as const
</script>

<template>
  <template v-if="src">
    <Image :src="src" :style="position" />
    <View :style="{ ...position, backgroundColor: 'white', opacity: 0.8 }" />
  </template>
</template>
