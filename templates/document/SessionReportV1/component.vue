<script setup lang="ts">
import LogoMark from '../_shared/LogoMark.vue'
import QrCode from '../_shared/QrCode.vue'
import { Document, Page, View, Text } from '@ceereals/vue-pdf'
import { computed } from 'vue'
import { isToken } from '../_shared/format'
import { upiLink, type QrTarget } from '../_shared/qr'
import type { QrStyle } from '~/server/utils/qr'

interface Section {
  heading: string
  text: string
  bullets: string[]
}

interface Clinic {
  name: string
  address: string
  phone: string
}

const props = defineProps<{
  organizationLogo?: string
  organizationFont: string
  organizationColorPrimary: string
  organizationColorAccent: string
  practitionerName: string
  practitionerQualifications: string[]
  practitionerRegistrationNumber?: string
  practitionerPhone?: string
  practitionerQrUrl?: string
  qrStyle?: QrStyle
  qrUpiId?: string
  qrUpiName?: string
  qrUrl?: string
  qrTarget?: QrTarget
  clientName: string
  clientAge?: string
  clientSex?: string
  sessionNumber: string
  sessionDate: string | Date
  sections: Section[]
  clinics: Clinic[]
}>()

const dotDate = (value: unknown) => {
  if (isToken(value)) return value
  const date = new Date(value as string | number | Date)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`
}

const qrText = computed(() => {
  if (props.practitionerQrUrl) return props.practitionerQrUrl
  const payment = props.qrTarget === 'upi' ? upiLink({ upiId: props.qrUpiId, name: props.practitionerName || props.qrUpiName }) : undefined
  return payment || props.qrUrl
})

const clientLine = () => [`NAME ${props.clientName}`, props.clientAge ? `AGE ${props.clientAge}` : '', props.clientSex ? `SEX ${props.clientSex}` : ''].filter(Boolean).join('   ')

const styles = {
  page: { padding: '36 40 150 40', fontSize: 11, color: '#1A1A1A', fontStyle: 'normal' as const },
  headerRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, justifyContent: 'space-between' as const },
  headerSide: { width: 170 },
  headerCenter: { flex: 1, alignItems: 'center' as const },
  headerRight: { width: 170 },
  phone: { fontSize: 10, color: '#888888', marginTop: 4 },
  practitionerName: { fontSize: 16, fontWeight: 'bold' as const },
  qualification: { fontSize: 11, marginTop: 3 },
  clientLine: { fontSize: 10, textAlign: 'center' as const, marginTop: 20, marginBottom: 24 },
  sessionRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 12 },
  bold: { fontWeight: 'bold' as const },
  section: { marginBottom: 10 },
  heading: { fontSize: 11, fontWeight: 'bold' as const, marginBottom: 4 },
  bulletRow: { flexDirection: 'row' as const, marginLeft: 14, marginTop: 6 },
  bullet: { width: 14, fontSize: 11 },
  bulletText: { flex: 1, fontSize: 11, lineHeight: 1.4 },
  footer: { position: 'absolute' as const, bottom: 30, left: 40, right: 40, flexDirection: 'row' as const },
  clinic: { flex: 1, paddingRight: 10 },
  clinicName: { fontSize: 10, fontWeight: 'bold' as const },
  clinicText: { fontSize: 8, color: '#555555', marginTop: 4, lineHeight: 1.4 },
  clinicPhone: { fontSize: 8, fontWeight: 'bold' as const, marginTop: 4 },
}
</script>

<template>
  <Document title="Session Report" :author="practitionerName" creator="Modest Human Brands" producer="MDoc">
    <Page size="A4" :style="[styles.page, { fontFamily: organizationFont }]">
      <View v-if="clinics.length" fixed :style="styles.footer">
        <View v-for="(clinic, index) in clinics" :key="index" :style="styles.clinic">
          <Text :style="styles.clinicName">{{ clinic.name }}</Text>
          <Text v-if="clinic.address" :style="styles.clinicText">{{ clinic.address }}</Text>
          <Text v-if="clinic.phone" :style="styles.clinicPhone">{{ clinic.phone }}</Text>
        </View>
      </View>

      <View :style="styles.headerRow">
        <View :style="styles.headerSide">
          <QrCode
            v-if="qrText"
            :text="qrText"
            :qr-style="qrStyle"
            :primary="organizationColorPrimary"
            :accent="organizationColorAccent"
            :logo="organizationLogo"
            :caption="practitionerPhone || 'Scan to view\nthis report'"
            layout="column"
            caption-align="left" />
          <Text v-else-if="practitionerPhone" :style="styles.phone">{{ practitionerPhone }}</Text>
        </View>
        <View :style="styles.headerCenter">
          <LogoMark :src="organizationLogo" :box="{ width: 80, height: 80 }" />
        </View>
        <View :style="styles.headerRight">
          <Text :style="{ ...styles.practitionerName, color: organizationColorPrimary }">{{ practitionerName }}</Text>
          <Text v-for="(line, index) in practitionerQualifications" :key="index" :style="styles.qualification">{{ line }}</Text>
          <Text v-if="practitionerRegistrationNumber" :style="styles.qualification">Reg No. {{ practitionerRegistrationNumber }}</Text>
        </View>
      </View>

      <Text :style="styles.clientLine">{{ clientLine() }}</Text>

      <View :style="styles.sessionRow">
        <Text :style="styles.bold">SESSION {{ sessionNumber }}</Text>
        <Text :style="styles.bold">DATE: - {{ dotDate(sessionDate) }}</Text>
      </View>

      <View v-for="(section, index) in sections" :key="index" :style="styles.section">
        <Text v-if="section.text" :style="{ fontSize: 11 }">
          <Text :style="styles.bold">{{ section.heading }}: </Text>{{ section.text }}
        </Text>
        <Text v-else :style="styles.heading">{{ section.heading }}</Text>
        <View v-for="(bullet, bIndex) in section.bullets" :key="bIndex" :style="styles.bulletRow" :wrap="false">
          <Text :style="styles.bullet">•</Text>
          <Text :style="styles.bulletText">{{ bullet }}</Text>
        </View>
      </View>
    </Page>
  </Document>
</template>
