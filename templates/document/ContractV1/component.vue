<script setup lang="ts">
import { Document, Page, View, Text, Image } from '@ceereals/vue-pdf'

const props = defineProps<{
  organizationName: string
  organizationLegalName: string
  organizationEntityType: string
  organizationTradeRelationship: string
  organizationGstin?: string
  organizationPan?: string
  organizationAddress: string
  organizationLogo: string
  organizationFont: string
  organizationColorPrimary: string
  organizationColorAccent: string
  agreementDate: string | Date
  contractorName: string
  contractorRole: string
  contractorAddress: string
  contractorPhone: string
  contractorEmail: string
  projectTitle: string
  serviceCategory: string
  shootDate: string | Date
  shootLocation: string
  callTime: string
  expiresIn: string | Date
  deliverables: string[]
  totalAmount: number
  advancePercentage: number
  advanceAmount: number
  balanceAmount: number
  parsedTerms: {
    type: string
    text?: string
    items?: { text: string; subitems?: { text: string }[] }[]
  }[]
}>()

const formatCurrency = (val: number) => `${val.toLocaleString('en-IN')} Rupees`
const formatDate = (val: string | Date) => (val ? new Date(val).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '')
const formatTime = (val: string) => {
  if (!val) return ''
  if (val.toUpperCase().includes('AM') || val.toUpperCase().includes('PM')) return val

  const [hours, minutes] = val.split(':')
  if (!hours || !minutes) return val

  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12

  return `${h12}:${minutes.slice(0, 2)} ${ampm}`
}

// --- 8-Point Grid & Harmonized Quotation Styles ---
const styles = {
  page: { padding: '40 40 120 40', fontSize: 12, color: '#1A1A1A', lineHeight: 1.4, fontStyle: 'normal' as const },
  headerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 16 },
  logoSection: { width: '50%' },
  metaSection: { width: '50%', alignItems: 'flex-end' as const },
  pageFooter: { position: 'absolute' as const, bottom: 40, left: 40, right: 40, flexDirection: 'row' as const, justifyContent: 'flex-end' as const, paddingTop: 16 },
  pageFooterText: { fontSize: 12, color: '#888888' },
  footer: { position: 'absolute' as const, bottom: 40, left: 40, right: 40, flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  footerText: { fontSize: 12, fontWeight: 'bold' as const },
  titleContainer: { marginBottom: 16, alignItems: 'flex-end' as const },
  metaGridRow: { flexDirection: 'row' as const, width: 160, marginTop: 8 },
  metaGridLabel: { width: 80, fontWeight: 'bold' as const, fontSize: 12 },
  metaGridValue: { flex: 1, fontSize: 12, textAlign: 'right' as const },
  infoBanner: { flexDirection: 'row' as const, marginHorizontal: -40, padding: '16 40' },
  bannerCol: { flex: 1, paddingRight: 16 },
  labelBold: { fontWeight: 'bold' as const, marginBottom: 4, fontSize: 12 },
  sectionTitle: { fontSize: 24, textAlign: 'center' as const, fontWeight: 'bold' as const },
  tableHeader: { flexDirection: 'row' as const, borderBottomWidth: 1, borderBottomColor: '#000000', paddingBottom: 8, marginBottom: 16 },
  tableRow: { flexDirection: 'row' as const, borderBottomWidth: 1, borderBottomColor: '#EEEEEE', paddingVertical: 12 },
  colName: { flex: 2, paddingRight: 16, fontWeight: 'bold' as const, fontSize: 12 },
  colDesc: { flex: 3.5, paddingRight: 16 },
  colRate: { flex: 1.5, textAlign: 'right' as const, fontSize: 12 },
  colQty: { flex: 1, textAlign: 'center' as const, fontSize: 12 },
  colAmount: { flex: 3, textAlign: 'right' as const, fontWeight: 'bold' as const, fontSize: 12 },
  colLeftSpan: { flex: 8, paddingRight: 16 },
  bulletRow: { flexDirection: 'row' as const, marginBottom: 4 },
  bullet: { width: 12, color: '#555555', fontSize: 12 },
  bulletText: { flex: 1, color: '#555555', fontSize: 12, lineHeight: 1.4 },
  financialRow: { flexDirection: 'row' as const, marginTop: 8 },
  financialTotalRow: { flexDirection: 'row' as const, marginHorizontal: -40, padding: '16 40', marginTop: 16, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  accountBox: { flexDirection: 'row' as const, marginTop: 24, paddingTop: 0 },
  accountCol: { paddingRight: 16, whitespace: 'nowrap' as const },
  accountLabel: { fontWeight: 'bold' as const, fontSize: 12, marginBottom: 4 },
  accountValue: { fontSize: 12, color: '#555555' },
  termHeading: { fontSize: 16, fontWeight: 'bold' as const, marginTop: 16, marginBottom: 8, color: '#000000' },
  termParagraph: { color: '#444444', fontSize: 12, marginBottom: 8 },
  acceptanceTitle: { fontSize: 24, fontWeight: 'bold' as const, textAlign: 'center' as const, marginBottom: 24, marginTop: 24 },
  acceptanceSub: { fontSize: 12, marginBottom: 24 },
  accGridHeader: { flexDirection: 'row' as const, backgroundColor: props.organizationColorAccent + '1A', marginHorizontal: -40, padding: '16 40', fontWeight: 'bold' as const, marginBottom: 24 },
  accGridRow: { flexDirection: 'row' as const, padding: '0 0', marginBottom: 32 },
  accCol: { flex: 1, fontSize: 12 },
  accNote: { fontSize: 12, color: '#555555', marginTop: 48, textAlign: 'center' as const },
  introText: { fontSize: 12, marginTop: 24, marginBottom: 16 },
  bold: { fontWeight: 'bold' as const, color: '#000000' },
  list: { marginLeft: 16, marginTop: 4, marginBottom: 8 },
}
</script>

<template>
  <Document title="Contract" :author="organizationName" creator="Modest Human Brands" producer="MDoc">
    <Page size="A4" :style="[styles.page, { fontFamily: organizationFont }]">
      <View fixed :style="styles.pageFooter">
        <Image :src="organizationLogo" :style="{ position: 'absolute', left: -65, bottom: -65, width: 180, height: 180 }" />
        <View :style="{ position: 'absolute', left: -65, bottom: -65, width: 180, height: 180, backgroundColor: 'white', opacity: 0.8 }"> </View>
        <Text :style="styles.pageFooterText">Signature: ______________________</Text>
      </View>

      <View :style="styles.headerRow">
        <View :style="{ ...styles.logoSection, marginTop: 0 }">
          <Image :src="organizationLogo" :style="{ width: 80, height: 80, marginBottom: 16 }" />
          <Text :style="{ fontWeight: 'bold', fontSize: 16 }">{{ organizationName }}</Text>

          <Text v-if="organizationLegalName && organizationName !== organizationLegalName" :style="{ fontSize: 10, color: '#555555', marginTop: 4 }">
            {{
              organizationTradeRelationship === 'Trading As'
                ? 'Trading as'
                : organizationTradeRelationship === 'Operating Division'
                  ? 'An operating division of'
                  : organizationTradeRelationship === 'Wholly-Owned Subsidiary'
                    ? 'A subsidiary of'
                    : 'A brand of'
            }}
            {{ organizationLegalName }}
          </Text>
          <Text v-else-if="organizationLegalName && organizationName === organizationLegalName && organizationEntityType" :style="{ fontSize: 10, color: '#555555', marginTop: 4 }">
            {{ organizationEntityType }}
          </Text>

          <Text :style="{ color: '#555555', marginTop: 4, fontSize: 12 }">{{ organizationAddress }}</Text>
          <Text v-if="organizationGstin" :style="{ color: '#888888', marginTop: 8, fontSize: 10 }"> GSTIN: {{ organizationGstin }} </Text>
          <Text v-if="organizationPan" :style="{ color: '#888888', marginTop: 4, fontSize: 10 }"> PAN: {{ organizationPan }} </Text>
        </View>

        <View :style="styles.metaSection">
          <View :style="styles.titleContainer">
            <Text :style="{ fontSize: 24, color: props.organizationColorAccent, fontWeight: 'bold' as const, textAlign: 'right' }"> Contractor Agreement </Text>
            <Text :style="{ fontSize: 12, marginTop: 16 }">Project {{ projectTitle }}</Text>
          </View>

          <View :style="styles.metaGridRow">
            <Text :style="{ ...styles.metaGridLabel, color: organizationColorPrimary }">Issued</Text>
            <Text :style="styles.metaGridValue">
              {{ formatDate(agreementDate) }}
            </Text>
          </View>
          <View :style="styles.metaGridRow">
            <Text :style="{ ...styles.metaGridLabel, color: organizationColorPrimary }">Expiry</Text>
            <Text :style="styles.metaGridValue">
              {{ formatDate(expiresIn) }}
            </Text>
          </View>
        </View>
      </View>

      <View :style="{ ...styles.infoBanner, backgroundColor: organizationColorAccent + '33' }">
        <View :style="styles.bannerCol">
          <Text :style="{ ...styles.labelBold, color: organizationColorPrimary }">Service Provider</Text>
          <Text :style="{ fontSize: 12 }">{{ contractorName }}</Text>
          <Text :style="{ fontSize: 12 }">{{ contractorRole }}</Text>
          <Text :style="{ fontSize: 12 }">{{ serviceCategory }}</Text>
        </View>
        <View :style="styles.bannerCol">
          <Text :style="{ ...styles.labelBold, color: organizationColorPrimary }">Contact Details</Text>
          <Text :style="{ fontSize: 12 }">Phone No: {{ contractorPhone }}</Text>
          <Text :style="{ fontSize: 12 }">Email: {{ contractorEmail }}</Text>
        </View>
        <View :style="styles.bannerCol">
          <Text :style="{ ...styles.labelBold, color: organizationColorPrimary }">Project Details</Text>
          <Text :style="{ fontSize: 12 }">Date: {{ formatDate(shootDate) }}</Text>
          <Text :style="{ fontSize: 12 }">Location: {{ shootLocation }}</Text>
          <Text :style="{ fontSize: 12 }">Call Time: {{ formatTime(callTime) }}</Text>
        </View>
      </View>

      <Text :style="{ ...styles.sectionTitle, marginTop: 24, marginBottom: 24 }">SCOPE OF WORK & DELIVERABLES</Text>
      <View :style="styles.tableHeader">
        <Text :style="{ width: 40, fontWeight: 'bold' as const, fontSize: 12 }">No.</Text>
        <Text :style="{ flex: 1, fontWeight: 'bold' as const, fontSize: 12 }">Description</Text>
      </View>

      <View v-for="(item, index) in deliverables" :key="index" :style="styles.tableRow" :wrap="false">
        <Text :style="{ width: 40, fontSize: 12 }">{{ String(index + 1).padStart(2, '0') }}</Text>
        <Text :style="{ flex: 1, fontSize: 12, lineHeight: 1.4 }">{{ item }}</Text>
      </View>

      <View :style="styles.financialRow" :wrap="false">
        <Text :style="{ ...styles.colLeftSpan, fontWeight: 'bold', fontSize: 12 }">Total Fee</Text>
        <Text :style="styles.colAmount">{{ formatCurrency(totalAmount) }}</Text>
      </View>

      <View v-if="advanceAmount > 0" :style="styles.financialRow" :wrap="false">
        <Text :style="{ ...styles.colLeftSpan, color: '#888888', fontSize: 12 }"> Advance ({{ advancePercentage }}%) </Text>
        <Text :style="{ ...styles.colAmount, color: '#888888' }">{{ formatCurrency(advanceAmount) }}</Text>
      </View>

      <View :style="{ ...styles.financialTotalRow, backgroundColor: organizationColorAccent + '33', marginBottom: 32 }" :wrap="false">
        <Text :style="{ ...styles.colLeftSpan, fontWeight: 'bold', fontSize: 16 }">Remaining Balance</Text>
        <Text :style="{ ...styles.colAmount, fontSize: 16 }">{{ formatCurrency(balanceAmount) }}</Text>
      </View>

      <View v-for="(block, bIndex) in parsedTerms" :key="bIndex" :wrap="false">
        <Text v-if="block.type === 'heading'" :style="styles.termHeading">{{ block.text }}</Text>
        <Text v-if="block.type === 'paragraph'" :style="styles.termParagraph">{{ block.text }}</Text>
        <View v-if="block.type === 'list'" :style="styles.list">
          <View v-for="(item, iIndex) in block.items" :key="iIndex">
            <View :style="styles.bulletRow">
              <Text :style="styles.bulletText">- {{ item.text }}</Text>
            </View>
            <View v-if="item.subitems" :style="{ marginLeft: 16 }">
              <View v-for="(subitem, sIndex) in item.subitems" :key="'sub_' + sIndex" :style="styles.bulletRow">
                <Text :style="styles.bulletText">• {{ subitem.text }}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Page>

    <Page size="A4" :style="[styles.page, { fontFamily: organizationFont }]">
      <View fixed :style="[styles.footer, { flexDirection: 'row-reverse' }]">
        <Image :src="organizationLogo" :style="{ position: 'absolute', left: -65, bottom: -65, width: 180, height: 180 }" />
        <View :style="{ position: 'absolute', left: -65, bottom: -65, width: 180, height: 180, backgroundColor: 'white', opacity: 0.8 }"> </View>
        <Text :render="(ctx) => `Page ${ctx.pageNumber} of ${ctx.totalPages}`" :style="styles.footerText" />
      </View>

      <Text :style="styles.acceptanceTitle">Acceptance of Terms</Text>
      <Text :style="styles.acceptanceSub">
        I, <Text :style="styles.bold">{{ contractorName }}</Text
        >, accept the agreement structure and choose to execute the project under the terms and conditions detailed above.
      </Text>

      <View :style="styles.accGridHeader">
        <Text :style="styles.accCol">For {{ organizationName }}</Text>
        <Text :style="styles.accCol">For Service Provider</Text>
      </View>

      <View :style="styles.accGridRow">
        <Text :style="styles.accCol">Signature:</Text>
        <Text :style="styles.accCol">Signature:</Text>
      </View>
      <View :style="styles.accGridRow">
        <Text :style="styles.accCol">Name:</Text>
        <Text :style="styles.accCol">Name:</Text>
      </View>
      <View :style="styles.accGridRow">
        <Text :style="styles.accCol">Date:</Text>
        <Text :style="styles.accCol">Date:</Text>
      </View>
      <View :style="styles.accGridRow">
        <Text :style="styles.accCol">Place:</Text>
        <Text :style="styles.accCol">Place:</Text>
      </View>

      <Text :render="(ctx) => `N.B: This Agreement consists of ${ctx.totalPages} pages including this one. Please initial and sign where indicated.`" :style="styles.accNote"></Text>
    </Page>
  </Document>
</template>
