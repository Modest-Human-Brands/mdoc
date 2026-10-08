<script setup lang="ts">
import { Image, Text, View } from '@ceereals/vue-pdf'
import { computed } from 'vue'

// Organisation logo. Without a `src` (the neutral "sample" preview) it draws the grey "LOGO" placeholder circle.
const props = defineProps<{
  src?: string
  /** Size and spacing of the logo box, e.g. { width: 80, height: 80, marginBottom: 16 } */
  box: Record<string, any>
}>()

const size = computed(() => Math.min(Number(props.box.width) || 80, Number(props.box.height) || 80))

const circleStyle = computed(() => ({
  ...props.box,
  borderRadius: 999,
  backgroundColor: '#D9D9D9',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
}))

const labelStyle = computed(() => ({ fontSize: Math.max(4, size.value * 0.16), color: '#888888', fontWeight: 'bold' as const }))
</script>

<template>
  <Image v-if="src" :src="src" :style="box" />
  <View v-else :style="circleStyle">
    <Text :style="labelStyle">LOGO</Text>
  </View>
</template>
