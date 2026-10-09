<script setup lang="ts">
import { Image, Text, View } from '@ceereals/vue-pdf'
import { computed } from 'vue'

const props = defineProps<{
  src?: string
  box: Record<string, any>
}>()

const size = computed(() => Math.min(Number(props.box.width) || 80, Number(props.box.height) || 80))

// Ensure the image never shrinks in a flex row and retains its 1:1 aspect ratio
const imageStyle = computed(() => ({
  flexShrink: 0,
  objectFit: 'contain' as const,
  ...props.box,
}))

const circleStyle = computed(() => ({
  flexShrink: 0,
  ...props.box,
  borderRadius: 999,
  backgroundColor: '#D9D9D9',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
}))

const labelStyle = computed(() => ({
  fontSize: Math.max(4, size.value * 0.16),
  color: '#888888',
  fontWeight: 'bold' as const,
}))
</script>

<template>
  <Image v-if="src" :src="src" :style="imageStyle" />
  <View v-else :style="circleStyle">
    <Text :style="labelStyle">LOGO</Text>
  </View>
</template>
