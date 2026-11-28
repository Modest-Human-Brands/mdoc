<script setup lang="ts">
import { Image, View } from './pdf'

defineProps<{ src?: string }>()

/**
 * Sits whole in the bottom margin, 20pt in from the page's left and bottom edges. Footers start 40pt in, hence -20.
 * Its top is 116pt up the page, under the 120pt bottom padding, so body text never runs over it.
 */
const position = { position: 'absolute', left: -20, bottom: -20, width: 96, height: 96 } as const
</script>

<template>
  <template v-if="src">
    <Image :src="src" :style="{ ...position, objectFit: 'contain' }" />
    <View :style="{ ...position, backgroundColor: 'white', opacity: 0.8 }" />
  </template>
</template>
