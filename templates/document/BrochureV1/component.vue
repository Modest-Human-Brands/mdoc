<script setup lang="ts">
import LogoMark from '../_shared/LogoMark.vue'
import { Document, Page, View, Text, Image } from '@ceereals/vue-pdf'
import { computed } from 'vue'

const props = defineProps<{
  organizationName: string
  organizationLogo: string
  organizationFont: string
  organizationColorPrimary: string
  organizationColorAccent: string
  organizationPhone: string
  organizationEmail: string
  organizationAddress: string
  socialInitials: string[]
  leafImageUrl: string
  coverEyebrow: string
  coverTitle: string
  coverDescription: string
  flap: { heading: string; text: string }
  insideLeft: { heading: string; text: string }
  insideRight: { heading: string; text: string }
  servicesHeading: string
  serviceItems: string[]
  serviceImageUrl: string
  serviceImageCaption: string
  ctaLabel: string
  ctaPhone: string
  ctaNote: string
  ctaSocialLabel: string
}>()

// Figma frame is 735 x 520; scale uniformly to A4 landscape (842 x 595).
const S = 842 / 735
const u = (n: number) => Math.round(n * S * 100) / 100

const NEUTRAL = '#D9D9D9'
const MUTED = '#3D3D3D'

const tint = computed(() => props.organizationColorAccent + '33')

// Unbroken strings (emails) cannot wrap, so shrink them to stay inside the contact card.
const contactSize = (value: string) => u(value.length > 26 ? 9.5 : value.length > 22 ? 10.5 : 12)

type Shape = { x: number; y: number; w: number; h: number; r: [number, number, number, number]; tone: 'neutral' | 'accent' | 'tint' }

const topShapes: Shape[] = [
  { x: -26.2, y: -32.75, w: 131.02, h: 104.79, r: [90, 60, 110, 70], tone: 'neutral' },
  { x: 6.55, y: -29.47, w: 78.61, h: 65.49, r: [60, 50, 70, 40], tone: 'accent' },
  { x: 111.36, y: -45.84, w: 150.67, h: 124.43, r: [110, 60, 90, 130], tone: 'tint' },
]
const bottomShapes: Shape[] = [
  { x: -39.3, y: 399.5, w: 196.52, h: 150.63, r: [130, 150, 70, 110], tone: 'tint' },
  { x: 58.96, y: 406.05, w: 124.47, h: 78.59, r: [70, 90, 50, 60], tone: 'accent' },
  { x: 157.22, y: 458.44, w: 98.26, h: 85.14, r: [60, 80, 40, 70], tone: 'neutral' },
]
const decorShapes = [...topShapes, ...bottomShapes]

const shapeStyle = (s: Shape) => {
  // Mimic CSS corner-radius clamping so overlapping radii never distort the shape.
  const [tl, tr, br, bl] = s.r
  const f = Math.min(1, s.w / (tl + tr), s.w / (bl + br), s.h / (tl + bl), s.h / (tr + br))
  return {
    position: 'absolute' as const,
    left: u(s.x),
    top: u(s.y),
    width: u(s.w),
    height: u(s.h),
    borderTopLeftRadius: u(tl * f),
    borderTopRightRadius: u(tr * f),
    borderBottomRightRadius: u(br * f),
    borderBottomLeftRadius: u(bl * f),
    backgroundColor: s.tone === 'accent' ? props.organizationColorAccent : s.tone === 'tint' ? tint.value : NEUTRAL,
  }
}

const styles = {
  page: { flexDirection: 'row' as const, backgroundColor: '#FFFFFF', color: '#191919' },
  panel: { width: '33.3333%', height: '100%', overflow: 'hidden' as const },
  decor: { position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%' },
  lockup: { flexDirection: 'row' as const, alignItems: 'center' as const },
  lockupText: {
    flex: 1, // Allow text to take remaining width and wrap cleanly
    fontSize: u(14),
    lineHeight: 1.25,
    fontWeight: 'bold' as const,
    letterSpacing: u(0.72),
    textTransform: 'uppercase' as const,
  },
  heading: { fontSize: u(24), lineHeight: 1.25 },
  body: { fontSize: u(12), lineHeight: 1.5 },
}
</script>

<template>
  <Document title="Brochure" :author="organizationName" creator="Modest Human Brands" producer="MDoc">
    <Page size="A4" orientation="landscape" :style="[styles.page, { fontFamily: organizationFont }]" :wrap="false">
      <View :style="[styles.panel, { paddingTop: u(96), paddingHorizontal: u(26), backgroundColor: '#FFFFFF' }]">
        <View :style="styles.decor">
          <View v-for="(shape, i) in decorShapes" :key="i" :style="shapeStyle(shape)" />
          <Image v-if="leafImageUrl" :src="leafImageUrl" :style="{ position: 'absolute', left: u(150), top: u(4), width: u(72), height: u(82) }" />
        </View>
        <Text :style="[styles.heading, { color: organizationColorPrimary }]">{{ flap.heading }}</Text>
        <Text :style="[styles.body, { color: organizationColorPrimary, marginTop: u(8) }]">{{ flap.text }}</Text>
      </View>

      <View :style="[styles.panel, { paddingTop: u(40), paddingHorizontal: u(26), backgroundColor: tint }]">
        <View :style="styles.lockup">
          <LogoMark :src="organizationLogo" :box="{ width: u(40), height: u(40), marginRight: u(8) }" />
          <Text :style="[styles.lockupText, { color: organizationColorPrimary }]">{{ organizationName }}</Text>
        </View>

        <View
          :style="{
            marginTop: u(22),
            padding: u(16),
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: u(24),
            borderTopRightRadius: u(8),
            borderBottomRightRadius: u(26),
            borderBottomLeftRadius: u(12),
          }">
          <Text v-if="organizationPhone" :style="[styles.body, { fontSize: contactSize(organizationPhone), color: organizationColorPrimary, marginBottom: u(8) }]">{{ organizationPhone }}</Text>
          <Text v-if="organizationEmail" :style="[styles.body, { fontSize: contactSize(organizationEmail), color: organizationColorPrimary, marginBottom: u(8) }]">{{ organizationEmail }}</Text>
          <Text v-if="organizationAddress" :style="[styles.body, { color: organizationColorPrimary }]">{{ organizationAddress }}</Text>
        </View>

        <View :style="{ marginTop: u(22) }">
          <Text :style="{ fontSize: u(20), lineHeight: 1.25, color: organizationColorPrimary }">{{ ctaLabel }}</Text>
          <Text v-if="ctaPhone" :style="{ fontSize: u(24), lineHeight: 1.25, fontWeight: 'bold', color: organizationColorPrimary, marginTop: u(4) }">{{ ctaPhone }}</Text>
          <Text v-if="ctaNote" :style="{ fontSize: u(10), lineHeight: 1.2, color: MUTED, marginTop: u(4) }">{{ ctaNote }}</Text>
        </View>

        <View v-if="socialInitials.length" :style="{ marginTop: u(22) }">
          <Text v-if="ctaSocialLabel" :style="{ fontSize: u(12), lineHeight: 1.5, fontWeight: 'bold', color: organizationColorPrimary, marginBottom: u(10) }">{{ ctaSocialLabel }}</Text>
          <View :style="{ flexDirection: 'row' }">
            <View
              v-for="(initial, i) in socialInitials"
              :key="i"
              :style="{ width: u(28), height: u(28), borderRadius: u(14), backgroundColor: organizationColorPrimary, marginRight: u(10), alignItems: 'center', justifyContent: 'center' }">
              <Text :style="{ fontSize: u(12), lineHeight: 1, color: '#FFFFFF', textAlign: 'center' }">{{ initial }}</Text>
            </View>
          </View>
        </View>
      </View>

      <View :style="[styles.panel, { paddingTop: u(96), paddingBottom: u(132), paddingHorizontal: u(26), justifyContent: 'space-between', backgroundColor: '#FFFFFF' }]">
        <View :style="styles.decor">
          <View v-for="(shape, i) in decorShapes" :key="i" :style="shapeStyle(shape)" />
          <Image v-if="leafImageUrl" :src="leafImageUrl" :style="{ position: 'absolute', left: u(150), top: u(4), width: u(72), height: u(82) }" />
        </View>

        <View :style="styles.lockup">
          <LogoMark :src="organizationLogo" :box="{ width: u(40), height: u(40), marginRight: u(8) }" />
          <Text :style="[styles.lockupText, { color: organizationColorPrimary }]">{{ organizationName }}</Text>
        </View>

        <View>
          <Text v-if="coverEyebrow" :style="{ fontSize: u(10), lineHeight: 1.2, fontWeight: 'bold', letterSpacing: u(0.5), textTransform: 'uppercase', color: MUTED, marginBottom: u(8) }">{{
            coverEyebrow
          }}</Text>
          <Text :style="{ fontSize: u(32), lineHeight: 1.25, fontWeight: 'bold', letterSpacing: -u(0.64), color: organizationColorPrimary }">{{ coverTitle }}</Text>
          <Text v-if="coverDescription" :style="[styles.body, { color: MUTED, marginTop: u(8) }]">{{ coverDescription }}</Text>
        </View>
      </View>
    </Page>

    <Page size="A4" orientation="landscape" :style="[styles.page, { fontFamily: organizationFont }]" :wrap="false">
      <View :style="[styles.panel, { paddingTop: u(96), paddingHorizontal: u(26), backgroundColor: '#FFFFFF' }]">
        <View :style="styles.decor">
          <View v-for="(shape, i) in decorShapes" :key="i" :style="shapeStyle(shape)" />
          <Image v-if="leafImageUrl" :src="leafImageUrl" :style="{ position: 'absolute', left: u(150), top: u(4), width: u(72), height: u(82) }" />
        </View>
        <Text :style="[styles.heading, { color: organizationColorPrimary }]">{{ insideLeft.heading }}</Text>
        <Text :style="[styles.body, { color: organizationColorPrimary, marginTop: u(8) }]">{{ insideLeft.text }}</Text>
      </View>

      <View :style="[styles.panel, { paddingTop: u(52), paddingHorizontal: u(26), backgroundColor: '#FFFFFF' }]">
        <View :style="{ position: 'absolute', left: u(21), top: u(26.2), width: u(203), height: 1, backgroundColor: NEUTRAL }" />
        <View :style="{ position: 'absolute', left: u(21), top: u(493.1), width: u(203), height: 1, backgroundColor: NEUTRAL }" />

        <Text :style="{ fontSize: u(20), lineHeight: 1.25, color: organizationColorPrimary }">{{ servicesHeading }}</Text>
        <View v-for="(item, i) in serviceItems" :key="i" :style="{ flexDirection: 'row', alignItems: 'center', marginTop: u(10) }" :wrap="false">
          <View :style="{ width: u(6), height: u(6), borderRadius: u(3), backgroundColor: organizationColorAccent, marginRight: u(8) }" />
          <Text :style="[styles.body, { flex: 1, color: organizationColorPrimary }]">{{ item }}</Text>
        </View>

        <View :style="{ marginTop: u(20) }">
          <View
            :style="{
              height: u(105),
              backgroundColor: tint,
              overflow: 'hidden',
              borderTopLeftRadius: u(52),
              borderTopRightRadius: u(16),
              borderBottomRightRadius: u(40),
              borderBottomLeftRadius: u(16),
            }">
            <Image v-if="serviceImageUrl" :src="serviceImageUrl" :style="{ width: '100%', height: u(105), objectFit: 'cover' }" />
          </View>
          <Text v-if="serviceImageCaption" :style="{ fontSize: u(10), lineHeight: 1.2, color: MUTED, marginTop: u(8) }">{{ serviceImageCaption }}</Text>
        </View>
      </View>

      <View :style="[styles.panel, { paddingTop: u(96), paddingHorizontal: u(26), backgroundColor: '#FFFFFF' }]">
        <View :style="styles.decor">
          <View v-for="(shape, i) in decorShapes" :key="i" :style="shapeStyle(shape)" />
          <Image v-if="leafImageUrl" :src="leafImageUrl" :style="{ position: 'absolute', left: u(150), top: u(4), width: u(72), height: u(82) }" />
        </View>
        <Text :style="[styles.heading, { color: organizationColorPrimary }]">{{ insideRight.heading }}</Text>
        <Text :style="[styles.body, { color: organizationColorPrimary, marginTop: u(8) }]">{{ insideRight.text }}</Text>
      </View>
    </Page>
  </Document>
</template>
