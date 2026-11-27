<script setup lang="ts">
import { G, Image, Path, Svg, Text, View } from '@ceereals/vue-pdf'
import { computed } from 'vue'
import { buildQr, defaultQrStyle, type QrStyle } from '~/server/utils/qr'
import { QR_PRINT_SIZE } from './qr'

const props = withDefaults(
  defineProps<{
    text: string
    qrStyle?: QrStyle
    primary: string
    accent: string
    logo?: string
    caption?: string
    captionAlign?: 'left' | 'right'
    layout?: 'row' | 'column'
  }>(),
  { layout: 'row', captionAlign: 'left' }
)

const QUIET = 2
const size = QR_PRINT_SIZE
const style = computed(() => props.qrStyle ?? defaultQrStyle)
const render = computed(() => buildQr(props.text, style.value, { primary: props.accent, accent: props.accent }))
const total = computed(() => render.value.size + QUIET * 2)
const logoFrame = computed(() => {
  const box = render.value.logoBox
  if (!box || !props.logo) return undefined
  const unit = size / total.value
  const side = box.size * unit
  return { left: (box.x + QUIET) * unit, top: (box.y + QUIET) * unit, side }
})

const eyes = computed(() => render.value.eyes.flatMap((eye) => [eye.frame, eye.ball]))
</script>

<template>
  <View :style="{ flexDirection: layout, alignItems: layout === 'row' ? 'center' : captionAlign === 'right' ? 'flex-end' : 'flex-start' }">
    <View :style="{ width: size, height: size, backgroundColor: '#FFFFFF' }">
      <Svg :width="size" :height="size" :viewBox="`0 0 ${total} ${total}`">
        <G :transform="`translate(${QUIET} ${QUIET})`">
          <Path :d="render.modules" :fill="render.moduleColor" />
          <Path v-for="(d, index) in eyes" :key="index" :d="d" :fill="render.eyeColor" />
        </G>
      </Svg>
      <View
        v-if="logoFrame"
        :style="{ position: 'absolute', left: logoFrame.left, top: logoFrame.top, width: logoFrame.side, height: logoFrame.side, backgroundColor: '#FFFFFF', padding: logoFrame.side * 0.1 }">
        <Image :src="logo!" :style="{ width: '100%', height: '100%', objectFit: 'contain' }" />
      </View>
    </View>
    <Text v-if="caption" :style="{ fontSize: 8, color: '#888888', lineHeight: 1.3, textAlign: captionAlign, ...(layout === 'row' ? { marginLeft: 8 } : { marginTop: 4 }) }">{{ caption }}</Text>
  </View>
</template>
