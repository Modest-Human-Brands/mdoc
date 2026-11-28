<script setup lang="ts">
import LogoMark from '../_shared/LogoMark.vue'
import QrCode from '../_shared/QrCode.vue'
import Terms from '../_shared/Terms.vue'
import type { TermSection } from '../_shared/terms'
import { Document, Page } from '@ceereals/vue-pdf'
import { View, Text, fitsOnPage } from '../_shared/pdf'
import HeadedList from '../_shared/HeadedList.vue'
import { computed } from 'vue'
import { isToken } from '../_shared/format'
import { upiLink, type QrTarget } from '../_shared/qr'
import type { QrStyle } from '~/server/utils/qr'

interface Location {
  label: string
  address: string
}

const props = defineProps<{
  organizationLogo?: string
  organizationFont: string
  organizationColorPrimary: string
  organizationColorAccent: string
  organizationPhone?: string
  organizationEmail?: string
  organizationWebsite?: string
  title: string
  subtitle: string
  receiptNumber: string
  issuedAt: string | Date
  patientId?: string
  patientName: string
  patientPhone?: string
  appointmentDate: string | Date
  startTime?: string
  endTime?: string
  service: string
  practitionerName?: string
  mode?: string
  link?: string
  amount: number | string
  currency: string
  paymentLabel: string
  paymentMethod?: string
  reference?: string
  paidAt?: string | Date
  status: string
  notes: string[]
  closingMessage?: string
  termSections?: TermSection[]
  locations: Location[]
  qrStyle?: QrStyle
  qrUpiId?: string
  qrUpiName?: string
  qrUrl?: string
  qrTarget?: QrTarget
}>()

const SYMBOLS: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }

const formatDate = (value: unknown, options: Intl.DateTimeFormatOptions) => {
  if (isToken(value)) return value
  if (!value) return ''
  const date = new Date(value as string | number | Date)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', options)
}

const longDate = (value: unknown) => formatDate(value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const shortDate = (value: unknown) => formatDate(value, { day: 'numeric', month: 'short', year: 'numeric' })

const amountText = computed(() => {
  if (isToken(props.amount)) return props.amount
  if (typeof props.amount !== 'number' || !Number.isFinite(props.amount)) return '—'
  const symbol = SYMBOLS[props.currency.toUpperCase()]
  const value = props.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  return symbol ? `${symbol} ${value}` : `${props.currency} ${value}`
})

const timeSlot = computed(() => [props.startTime, props.endTime].filter(Boolean).join(' – '))

const luminance = (hex: string) => {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? [...value].map((char) => char + char).join('') : value
  const [r = 0, g = 0, b = 0] = [0, 2, 4].map((index) => Number.parseInt(full.slice(index, index + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const onColor = (hex: string) => (/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex) && luminance(hex) > 0.6 ? '#111111' : '#FFFFFF')

const banner = computed(() => props.organizationColorPrimary)
const bannerText = computed(() => onColor(banner.value))
const titleText = computed(() => (isToken(props.title) ? props.title : String(props.title).toUpperCase()))
const paid = computed(() => props.status.trim().toUpperCase() === 'PAID')

const qrText = computed(() => {
  const payment = props.qrTarget === 'upi' ? upiLink({ upiId: props.qrUpiId, name: props.qrUpiName }) : undefined
  return payment || props.qrUrl
})

const contactLine = computed(() => [props.organizationPhone, props.organizationEmail, props.organizationWebsite].filter(Boolean).join('  ·  '))

const detailRows = (rows: [string, string | undefined, boolean?][]) => rows.filter(([, value]) => value)

const patientRows = computed(() =>
  detailRows([
    ['Patient ID', props.patientId, true],
    ['Name', props.patientName],
    ['Contact number', props.patientPhone],
  ])
)
const appointmentRows = computed(() =>
  detailRows([
    ['Date', longDate(props.appointmentDate)],
    ['Time slot', timeSlot.value],
    ['Consultation', props.service],
    ['With', props.practitionerName],
    ['Mode', props.mode],
    ['Link', props.link],
  ])
)
const paymentRows = computed(() =>
  detailRows([
    [props.paymentLabel, amountText.value],
    ['Paid via', props.paymentMethod],
    ['Transaction ID / UTR', props.reference],
    ['Payment date', shortDate(props.paidAt)],
  ])
)

const styles = {
  page: { paddingTop: 0, paddingBottom: 84, paddingHorizontal: 0, fontSize: 13, color: '#262629', fontStyle: 'normal' as const },
  header: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const, paddingTop: 10, paddingBottom: 4, paddingHorizontal: 40 },
  headerSide: { width: 180 },
  banner: { alignItems: 'center' as const, paddingVertical: 8, paddingHorizontal: 40 },
  title: { fontSize: 26, letterSpacing: 1 },
  subtitle: { fontSize: 13, marginTop: 4 },
  meta: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingHorizontal: 40, paddingTop: 6, paddingBottom: 4 },
  section: { paddingHorizontal: 40, marginTop: 5 },
  heading: { fontSize: 11.5, fontWeight: 'bold' as const, letterSpacing: 0.6, paddingTop: 2, paddingBottom: 3, borderBottomWidth: 0.75, borderBottomStyle: 'solid' as const },
  row: { flexDirection: 'row' as const, paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#E8E8EB', borderBottomStyle: 'solid' as const },
  key: { width: 160, color: '#7E7E87' },
  value: { flex: 1 },
  total: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 4, paddingHorizontal: 8 },
  note: { flexDirection: 'row' as const, paddingTop: 1 },
  closing: { fontSize: 14, textAlign: 'center' as const, paddingVertical: 6, paddingHorizontal: 40 },
  footer: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, alignItems: 'center' as const, paddingVertical: 6, paddingHorizontal: 40 },
  footerText: { fontSize: 10.5, textAlign: 'center' as const, marginTop: 4 },
}
</script>

<template>
  <Document title="Appointment Confirmation" :author="organizationEmail" creator="Modest Human Brands" producer="MDoc">
    <Page size="A4" :style="[styles.page, { fontFamily: organizationFont }]">
      <View :style="styles.header">
        <View :style="styles.headerSide">
          <QrCode
            v-if="qrText"
            :text="qrText"
            :qr-style="qrStyle"
            :primary="organizationColorPrimary"
            :accent="organizationColorAccent"
            :logo="organizationLogo"
            :caption="'Scan to view\nthis receipt'"
            layout="row" />
        </View>
        <LogoMark :src="organizationLogo" :box="{ width: 56, height: 56 }" />
        <View :style="styles.headerSide" />
      </View>

      <View :style="{ ...styles.banner, backgroundColor: banner }">
        <Text :style="{ ...styles.title, color: bannerText }">{{ titleText }}</Text>
        <Text :style="{ ...styles.subtitle, color: bannerText }">{{ subtitle }}</Text>
      </View>

      <View :style="styles.meta">
        <Text :style="{ flex: 1, paddingRight: 12 }">Receipt No. {{ receiptNumber }}</Text>
        <Text>Issued on {{ shortDate(issuedAt) }}</Text>
      </View>

      <HeadedList :style="styles.section" :items="patientRows" :texts-of="([, value]) => [value]">
        <template #heading>
          <Text :style="{ ...styles.heading, borderBottomColor: organizationColorAccent }">PATIENT</Text>
        </template>
        <template #item="{ item: [label, value, strong] }">
          <View :style="styles.row" :wrap="!fitsOnPage([value])">
            <Text :style="styles.key">{{ label }}</Text>
            <Text :style="[styles.value, strong ? { fontWeight: 'bold' } : {}]">{{ value }}</Text>
          </View>
        </template>
      </HeadedList>

      <HeadedList :style="styles.section" :items="appointmentRows" :texts-of="([, value]) => [value]">
        <template #heading>
          <Text :style="{ ...styles.heading, borderBottomColor: organizationColorAccent }">APPOINTMENT</Text>
        </template>
        <template #item="{ item: [label, value] }">
          <View :style="styles.row" :wrap="!fitsOnPage([value])">
            <Text :style="styles.key">{{ label }}</Text>
            <Text :style="styles.value">{{ value }}</Text>
          </View>
        </template>
      </HeadedList>

      <HeadedList :style="styles.section" :items="paymentRows" :texts-of="([, value]) => [value]">
        <template #heading>
          <Text :style="{ ...styles.heading, borderBottomColor: organizationColorAccent }">PAYMENT</Text>
        </template>
        <template #item="{ item: [label, value] }">
          <View :style="styles.row" :wrap="!fitsOnPage([value])">
            <Text :style="styles.key">{{ label }}</Text>
            <Text :style="styles.value">{{ value }}</Text>
          </View>
        </template>
        <View :style="{ ...styles.total, backgroundColor: paid ? '#E6F2EB' : '#FFF4E0' }" :wrap="false">
          <Text :style="{ ...styles.key, width: 150, fontWeight: 'bold', color: '#0D0D0F' }">Amount received</Text>
          <Text :style="{ ...styles.value, fontSize: 15, fontWeight: 'bold', color: '#0D0D0F' }">{{ amountText }} · {{ status }}</Text>
        </View>
      </HeadedList>

      <HeadedList v-if="notes.length" :style="styles.section" :items="notes" :texts-of="(note) => [note]">
        <template #heading>
          <Text :style="{ ...styles.heading, borderBottomColor: organizationColorAccent }">BEFORE YOUR SESSION</Text>
        </template>
        <template #item="{ item: note }">
          <View :style="styles.note" :wrap="!fitsOnPage([note])">
            <Text :style="{ width: 10 }">•</Text>
            <Text :style="{ flex: 1 }">{{ note }}</Text>
          </View>
        </template>
      </HeadedList>

      <Terms v-if="termSections?.length" :style="styles.section" :sections="termSections" heading="TERMS" :heading-style="{ ...styles.heading, borderBottomColor: organizationColorAccent }" />

      <Text v-if="closingMessage" :style="styles.closing">{{ closingMessage }}</Text>

      <View fixed :style="{ ...styles.footer, backgroundColor: banner }">
        <Text v-for="(location, index) in locations" :key="index" :style="{ ...styles.footerText, color: bannerText, ...(index === 0 ? { marginTop: 0 } : {}) }">
          {{ location.label ? `${location.label}: ` : '' }}{{ location.address }}
        </Text>
        <Text v-if="contactLine" :style="{ ...styles.footerText, color: bannerText, ...(locations.length ? {} : { marginTop: 0 }) }">{{ contactLine }}</Text>
      </View>
    </Page>
  </Document>
</template>
