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
  contractorTitle: string
  projectName: string
  shootDates: string | Date
  location: string
  callTime: string
  deliverables: string[]
  totalAmount: number
  expiresIn: string | Date
  parsedTerms: {
    type: string
    text?: string
    items?: { text: string; subitems?: { text: string }[] }[]
  }[]
}>()

// --- Formatters ---
const formatCurrency = (val: number) => val.toLocaleString('en-IN')
const formatDate = (val: string | Date) => (val ? new Date(val).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '')

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
  metaGridRow: { flexDirection: 'row' as const, marginTop: 8, gap: 8 },
  metaGridLabel: { fontWeight: 'bold' as const, fontSize: 12, textAlign: 'left' as const, whitespace: 'nowrap' },
  metaGridValue: { fontSize: 12, textAlign: 'right' as const, width: 80, whitespace: 'nowrap' },
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
  colAmount: { flex: 1.5, textAlign: 'right' as const, fontWeight: 'bold' as const, fontSize: 12 },
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
  termParagraph: { color: '#444444', fontSize: 12 },
  acceptanceTitle: { fontSize: 24, fontWeight: 'bold' as const, textAlign: 'center' as const, marginBottom: 24, marginTop: 24 },
  acceptanceSub: { fontSize: 12, marginBottom: 24 },
  accGridHeader: { flexDirection: 'row' as const, backgroundColor: props.organizationColorAccent + '1A', marginHorizontal: -40, padding: '16 40', fontWeight: 'bold' as const, marginBottom: 24 },
  accGridRow: { flexDirection: 'row' as const, padding: '0 0', marginBottom: 32 },
  accCol: { flex: 1, fontSize: 12 },
  accNote: { fontSize: 12, color: '#555555', marginTop: 48, textAlign: 'center' as const },
  introText: { fontSize: 12, marginTop: 24 },
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
            <!-- {{ organizationEntityType ? `(${organizationEntityType})` : '' }} -->
          </Text>
          <Text v-else-if="organizationLegalName && organizationName === organizationLegalName && organizationEntityType" :style="{ fontSize: 10, color: '#555555', marginTop: 4 }">
            {{ organizationEntityType }}
          </Text>

          <Text :style="{ color: '#555555', marginTop: 4, fontSize: 12 }">{{ organizationAddress }}</Text>

          <Text v-if="organizationGstin" :style="{ color: '#888888', marginTop: 8, fontSize: 10 }">GSTIN: {{ organizationGstin }}</Text>
          <Text v-if="organizationPan" :style="{ color: '#888888', marginTop: 4, fontSize: 10 }">PAN: {{ organizationPan }}</Text>
        </View>

        <View :style="styles.metaSection">
          <View :style="styles.titleContainer">
            <Text :style="{ fontSize: 24, color: props.organizationColorAccent, fontWeight: 'bold' as const }">Contractor Agreement</Text>
            <Text :style="{ fontSize: 12, marginTop: 16 }">Photography & Videography</Text>
          </View>

          <View :style="styles.metaGridRow">
            <Text :style="{ ...styles.metaGridLabel, color: organizationColorPrimary }">Date</Text>
            <Text :style="styles.metaGridValue">
              {{ formatDate(agreementDate) }}
            </Text>
          </View>
        </View>
      </View>

      <View :style="{ ...styles.infoBanner, backgroundColor: organizationColorAccent + '33' }">
        <View :style="styles.bannerCol">
          <Text :style="{ ...styles.labelBold, color: organizationColorPrimary }">Service Provider</Text>
          <Text :style="{ fontSize: 12 }">{{ contractorName }}</Text>
          <Text :style="{ fontSize: 12 }">{{ contractorTitle }}</Text>
        </View>
        <View :style="styles.bannerCol">
          <Text :style="{ ...styles.labelBold, color: organizationColorPrimary }">Project Details</Text>
          <Text :style="{ fontSize: 12 }">{{ projectName }}</Text>
          <Text :style="{ fontSize: 12 }"> Date: {{ formatDate(shootDates) }} </Text>
        </View>
        <View :style="styles.bannerCol">
          <Text :style="{ ...styles.labelBold, color: organizationColorPrimary }">Logistics</Text>
          <Text :style="{ fontSize: 12 }">{{ location }}</Text>
          <Text :style="{ fontSize: 12 }">Call Time: {{ callTime }}</Text>
        </View>
      </View>

      <Text :style="styles.introText">
        This Agreement is entered into as of <Text :style="styles.bold">{{ formatDate(agreementDate) }}</Text
        >, by and between <Text :style="styles.bold">{{ organizationName }}</Text> ("Company") and <Text :style="styles.bold">{{ contractorName }}</Text> ("Service Provider").
      </Text>

      <!-- Section 1 -->
      <View :wrap="false">
        <Text :style="styles.termHeading">1. Scope of Work & Deliverables</Text>
        <Text :style="styles.termParagraph">The Service Provider agrees to provide photography and/or videography services for the project detailed above, including the following deliverables:</Text>

        <View :style="styles.list">
          <View v-for="(item, index) in deliverables" :key="index" :style="styles.bulletRow">
            <Text :style="styles.bulletText">- {{ item }}</Text>
          </View>
        </View>
      </View>

      <!-- Section 2 -->
      <View :wrap="false">
        <Text :style="styles.termHeading">2. Compensation & Payment Terms</Text>
        <Text :style="styles.termParagraph"
          >The Company agrees to pay the Service Provider a total fee of <Text :style="styles.bold">₹{{ formatCurrency(totalAmount) }}</Text> for the services described above.</Text
        >
        <View :style="styles.list">
          <View :style="styles.bulletRow">
            <Text :style="styles.bulletText"
              >- <Text :style="styles.bold">Balance:</Text> After the Company receives the final payment amount from the client, the agreed payment will be given to the Service Provider within 2-3
              business days.</Text
            >
          </View>
          <View :style="styles.bulletRow">
            <Text :style="styles.bulletText"
              >- <Text :style="styles.bold">Expenses:</Text> The Company shall not reimburse the Service Provider for out-of-pocket expenses (e.g., travel, parking, equipment rentals) incurred during
              the project if not decided formally via mail or other channel.</Text
            >
          </View>
        </View>
      </View>

      <!-- Dynamic Terms Engine (Sections 3+) -->
      <View v-for="(block, bIndex) in parsedTerms" :key="bIndex" :wrap="false">
        <Text v-if="block.type === 'heading'" :style="styles.termHeading">{{ block.text }}</Text>
        <Text v-if="block.type === 'paragraph'" :style="styles.termParagraph">{{ block.text }}</Text>
        <View v-if="block.type === 'list'">
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
        <Text :style="styles.accCol">Signer Name:</Text>
        <Text :style="styles.accCol">Signer Name:</Text>
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
