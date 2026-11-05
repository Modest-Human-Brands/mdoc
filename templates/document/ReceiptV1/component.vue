<script setup lang="ts">
import LogoMark from '../_shared/LogoMark.vue'
import { Document, Page, View, Text } from '@ceereals/vue-pdf'
import { computed } from 'vue'
import { dateText, isToken, optionalNumber } from '../_shared/format'

interface ReceiptItem {
  title: string
  description: string
  periodStart?: string | Date
  periodEnd?: string | Date
  quantity: number | string
  rate: number | string
  discount: number | string
  taxRate: number | string
}

const props = defineProps<{
  organizationName: string
  organizationLegalName?: string
  organizationGstin?: string
  organizationPan?: string
  organizationAddress?: string
  organizationLogo?: string
  organizationFont: string
  organizationColorPrimary: string
  organizationColorAccent: string
  clientName: string
  clientCompany?: string
  clientAddress: string
  clientEmail: string
  clientPhone?: string
  receiptNumber: string
  invoiceNumber?: string
  orderNumber?: string
  paidDate: string | Date
  nextBillingDate?: string | Date
  items: ReceiptItem[]
  taxLabel: string
  currency: string
  amountPaid?: number | string
}>()

const fmt = (value: number | string) => (isToken(value) ? value : value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

const rows = computed(() =>
  props.items.map((item) => {
    const gross = optionalNumber(item.rate) * optionalNumber(item.quantity)
    const discount = optionalNumber(item.discount)
    const excl = Math.max(0, gross - discount)
    const tax = (excl * optionalNumber(item.taxRate)) / 100
    return {
      ...item,
      gross: isToken(item.rate) ? item.rate : gross,
      discountValue: discount,
      discountShown: isToken(item.discount) ? item.discount : discount > 0 ? `-${fmt(discount)}` : '—',
      excl,
      tax,
      amount: excl + tax,
    }
  })
)
const totalExcl = computed(() => rows.value.reduce((sum, r) => sum + r.excl, 0))
const totalTax = computed(() => rows.value.reduce((sum, r) => sum + r.tax, 0))
const total = computed(() => totalExcl.value + totalTax.value)
const paid = computed(() => (props.amountPaid === undefined || isToken(props.amountPaid) ? (props.amountPaid ?? total.value) : optionalNumber(props.amountPaid)))
const amountDue = computed(() => (isToken(paid.value) ? 0 : Math.max(0, total.value - (paid.value as number))))

const period = (item: ReceiptItem) => {
  if (!item.periodStart && !item.periodEnd) return ''
  return `${dateText(item.periodStart)} – ${dateText(item.periodEnd)}`
}

const meta = computed(() =>
  [
    { label: 'Receipt', value: props.receiptNumber, hash: true },
    { label: 'Invoice', value: props.invoiceNumber, hash: true },
    { label: 'Order', value: props.orderNumber, hash: true },
    { label: 'Paid on', value: props.paidDate ? dateText(props.paidDate) : '', hash: false },
    { label: 'Next billing', value: props.nextBillingDate ? dateText(props.nextBillingDate) : '', hash: false },
  ].filter((m) => m.value)
)

const styles = {
  page: { padding: '40 40 40 40', fontSize: 10, color: '#26262B', fontStyle: 'normal' as const },
  headerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 24 },
  left: { width: '50%' },
  right: { width: '50%', alignItems: 'flex-end' as const },
  muted: { color: '#6B6B73', fontSize: 10, marginTop: 3 },
  metaRow: { flexDirection: 'row' as const, marginTop: 3 },
  metaLabel: { fontSize: 10, color: '#6B6B73', marginRight: 4 },
  metaValue: { fontSize: 10, fontWeight: 'bold' as const },
  billed: { marginBottom: 24 },
  billedLabel: { fontSize: 8, fontWeight: 'bold' as const, marginBottom: 4 },
  tableHeader: { flexDirection: 'row' as const, borderBottomWidth: 1, paddingBottom: 6 },
  tableRow: { flexDirection: 'row' as const, borderBottomWidth: 1, borderBottomColor: '#EEEEEE', paddingVertical: 8 },
  th: { fontSize: 8, fontWeight: 'bold' as const, textAlign: 'right' as const },
  td: { fontSize: 10, textAlign: 'right' as const },
  colDesc: { flex: 4.2, paddingRight: 8 },
  colNum: { flex: 1.6 },
  totals: { alignSelf: 'flex-end' as const, width: 260, marginTop: 16 },
  totalRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginTop: 6 },
}
</script>

<template>
  <Document title="Receipt" :author="organizationName" creator="Modest Human Brands" producer="MDoc">
    <Page size="A4" :style="[styles.page, { fontFamily: organizationFont }]">
      <View :style="styles.headerRow">
        <View :style="styles.left">
          <LogoMark :src="organizationLogo" :box="{ width: 56, height: 56, marginBottom: 12 }" />
          <Text :style="{ fontWeight: 'bold', fontSize: 14 }">{{ organizationName }}</Text>
          <Text v-if="organizationLegalName && organizationLegalName !== organizationName" :style="styles.muted">{{ organizationLegalName }}</Text>
          <Text v-if="organizationAddress" :style="styles.muted">{{ organizationAddress }}</Text>
          <Text v-if="organizationGstin" :style="styles.muted">GSTIN: {{ organizationGstin }}</Text>
          <Text v-if="organizationPan" :style="styles.muted">PAN: {{ organizationPan }}</Text>
        </View>
        <View :style="styles.right">
          <Text :style="{ fontSize: 24, fontWeight: 'bold', color: organizationColorAccent, marginBottom: 8 }">RECEIPT</Text>
          <View v-for="m in meta" :key="m.label" :style="styles.metaRow">
            <Text :style="styles.metaLabel">{{ m.label }}{{ m.hash ? ' #' : '' }}</Text>
            <Text :style="styles.metaValue">{{ m.value }}</Text>
          </View>
          <Text :style="{ fontSize: 10, fontWeight: 'bold', color: '#00A63E', marginTop: 8 }">PAID</Text>
        </View>
      </View>

      <View :style="styles.billed">
        <Text :style="{ ...styles.billedLabel, color: organizationColorPrimary }">BILLED TO</Text>
        <Text :style="{ fontWeight: 'bold' }">{{ clientName }}</Text>
        <Text v-if="clientCompany" :style="styles.muted">{{ clientCompany }}</Text>
        <Text :style="styles.muted">{{ clientAddress }}</Text>
        <Text :style="styles.muted">{{ clientEmail }}</Text>
        <Text v-if="clientPhone" :style="styles.muted">{{ clientPhone }}</Text>
      </View>

      <View :style="{ ...styles.tableHeader, borderBottomColor: organizationColorPrimary }">
        <Text :style="{ ...styles.th, ...styles.colDesc, textAlign: 'left' }">DESCRIPTION</Text>
        <Text :style="{ ...styles.th, ...styles.colNum }">PRICE</Text>
        <Text :style="{ ...styles.th, ...styles.colNum }">DISCOUNT</Text>
        <Text :style="{ ...styles.th, ...styles.colNum }">TOTAL EXCL. TAX</Text>
        <Text :style="{ ...styles.th, ...styles.colNum }">TAX</Text>
        <Text :style="{ ...styles.th, ...styles.colNum }">{{ isToken(currency) ? 'AMOUNT' : `AMOUNT (${currency})` }}</Text>
      </View>

      <View v-for="(row, index) in rows" :key="index" :style="styles.tableRow" :wrap="false">
        <View :style="styles.colDesc">
          <Text :style="{ fontWeight: 'bold' }">{{ row.title }}</Text>
          <Text v-if="row.description" :style="styles.muted">{{ row.description }}</Text>
          <Text v-if="period(row)" :style="styles.muted">{{ period(row) }}</Text>
        </View>
        <Text :style="{ ...styles.td, ...styles.colNum }">{{ fmt(row.gross) }}</Text>
        <Text :style="{ ...styles.td, ...styles.colNum }">{{ row.discountShown }}</Text>
        <Text :style="{ ...styles.td, ...styles.colNum }">{{ fmt(row.excl) }}</Text>
        <Text :style="{ ...styles.td, ...styles.colNum }">{{ fmt(row.tax) }}</Text>
        <Text :style="{ ...styles.td, ...styles.colNum, fontWeight: 'bold' }">{{ fmt(row.amount) }}</Text>
      </View>

      <View :style="styles.totals" :wrap="false">
        <View :style="styles.totalRow">
          <Text>Total excl. tax</Text>
          <Text>{{ fmt(totalExcl) }}</Text>
        </View>
        <View :style="styles.totalRow">
          <Text>{{ taxLabel }}</Text>
          <Text>{{ fmt(totalTax) }}</Text>
        </View>
        <View :style="{ ...styles.totalRow, borderTopWidth: 1, borderTopColor: '#EEEEEE', paddingTop: 6 }">
          <Text :style="{ fontWeight: 'bold' }">Total</Text>
          <Text :style="{ fontWeight: 'bold' }">{{ fmt(total) }}</Text>
        </View>
        <View :style="styles.totalRow">
          <Text :style="{ color: '#00A63E' }">Payments</Text>
          <Text :style="{ color: '#00A63E' }">({{ fmt(paid) }})</Text>
        </View>
        <View :style="{ ...styles.totalRow, borderTopWidth: 1, borderTopColor: organizationColorPrimary, paddingTop: 6 }">
          <Text :style="{ fontWeight: 'bold', fontSize: 12 }">Amount Due</Text>
          <Text :style="{ fontWeight: 'bold', fontSize: 12 }">{{ currency }} {{ fmt(amountDue) }}</Text>
        </View>
      </View>
    </Page>
  </Document>
</template>
