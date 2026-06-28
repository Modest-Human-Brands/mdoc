<script setup lang="ts">
import { Document, Page, View, Text, Image } from '@ceereals/vue-pdf'
import { computed } from 'vue'

const props = defineProps<{
  pricingModel: 'project' | 'day'
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
  clientName: string
  clientAddress: string
  contactPhone: string
  contactEmail: string
  shootDate: string | Date
  shootAddress: string
  projectTitle: string
  projectQuoteNumber: string
  projectIssuedDate: string | Date
  deliverables: { title: string; description: string; points: string[]; rate: number; quantity: number }[]
  discountLabel: string
  discountValue: number
  isDiscountPercentage: boolean
  taxLabel: string
  taxRate: number
  accountName: string
  accountNumber: number
  bankName: string
  ifscCode: string
  parsedTerms: {
    type: string
    text?: string
    items?: { text: string; subitems?: { text: string }[] }[]
  }[]
  expiresIn: string | Date
}>()

const computedDeliverables = computed(() => props.deliverables.map((item) => ({ ...item, amount: item.rate * item.quantity })))
const subtotal = computed(() => computedDeliverables.value.reduce((sum, item) => sum + item.amount, 0))
const discountAmount = computed(() => (props.isDiscountPercentage ? (subtotal.value * props.discountValue) / 100 : props.discountValue))
const postDiscountTotal = computed(() => subtotal.value - discountAmount.value)
const taxAmount = computed(() => (postDiscountTotal.value * props.taxRate) / 100)
const grandTotal = computed(() => postDiscountTotal.value + taxAmount.value)

const formatCurrency = (val: number) => val.toLocaleString('en-IN')
const formatDate = (val: string | Date) => (val ? new Date(val).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '')

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
}
</script>

<template>
  <Document title="Quotation" :author="organizationName" creator="Modest Human Brands" producer="MDoc">
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
            <Text :style="{ fontSize: 24, color: props.organizationColorAccent, fontWeight: 'bold' as const }">Quotation Agreement</Text>
            <Text :style="{ fontSize: 12, marginTop: 16 }">Photography & Videography</Text>
          </View>

          <View :style="styles.metaGridRow">
            <Text :style="{ ...styles.metaGridLabel, color: organizationColorPrimary }">Quote nr.</Text>
            <Text :style="styles.metaGridValue">{{ projectQuoteNumber }}</Text>
          </View>
          <View :style="styles.metaGridRow">
            <Text :style="{ ...styles.metaGridLabel, color: organizationColorPrimary }">Issued</Text>
            <Text :style="styles.metaGridValue">
              {{ formatDate(projectIssuedDate) }}
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
          <Text :style="{ ...styles.labelBold, color: organizationColorPrimary }">Bill to</Text>
          <Text :style="{ fontSize: 12 }">{{ clientName }}</Text>
          <Text :style="{ fontSize: 12 }">{{ clientAddress }}</Text>
        </View>
        <View :style="styles.bannerCol">
          <Text :style="{ ...styles.labelBold, color: organizationColorPrimary }">Contact Details</Text>
          <Text :style="{ fontSize: 12 }">Phone No: {{ contactPhone }}</Text>
          <Text :style="{ fontSize: 12 }">Email: {{ contactEmail }}</Text>
        </View>
        <View :style="styles.bannerCol">
          <Text :style="{ ...styles.labelBold, color: organizationColorPrimary }">Shoot Details</Text>
          <Text :style="{ fontSize: 12 }">
            Date:
            {{ formatDate(shootDate) }}
          </Text>
          <Text :style="{ fontSize: 12 }">Address: {{ shootAddress }}</Text>
        </View>
      </View>

      <Text :style="{ ...styles.sectionTitle, marginTop: 24, marginBottom: 32 }">DELIVERABLES</Text>
      <View :style="styles.tableHeader">
        <Text :style="styles.colName">{{ pricingModel === 'day' ? 'Role / Phase' : 'Name of Service' }}</Text>
        <Text :style="{ ...styles.colDesc, fontWeight: 'bold', fontSize: 12 }">Description</Text>
        <Text :style="{ ...styles.colRate, fontWeight: 'bold', fontSize: 12 }">{{ pricingModel === 'day' ? 'Day Rate' : 'Unit Price' }}</Text>
        <Text :style="{ ...styles.colQty, fontWeight: 'bold', fontSize: 12 }">{{ pricingModel === 'day' ? 'Days' : 'Qty' }}</Text>
        <Text :style="styles.colAmount">Amount</Text>
      </View>

      <View v-for="(item, index) in computedDeliverables" :key="index" :style="styles.tableRow" :wrap="false">
        <Text :style="styles.colName">{{ item.title }}</Text>
        <View :style="styles.colDesc">
          <View v-if="item.points.length">
            <View v-for="(point, pIndex) in item.points" :key="pIndex" :style="styles.bulletRow">
              <Text :style="styles.bulletText">• {{ point }}</Text>
            </View>
          </View>
          <View v-else>
            <Text :style="styles.bulletText">{{ item.description }}</Text>
          </View>
        </View>
        <Text :style="styles.colRate">{{ formatCurrency(item.rate) }}</Text>
        <Text :style="styles.colQty">{{ item.quantity }}</Text>
        <Text :style="styles.colAmount">{{ formatCurrency(item.amount) }}</Text>
      </View>

      <View :style="styles.financialRow" :wrap="false">
        <Text :style="{ ...styles.colLeftSpan, fontWeight: 'bold', fontSize: 12 }">Subtotal</Text>
        <Text :style="styles.colAmount">{{ formatCurrency(subtotal) }}</Text>
      </View>

      <View v-if="discountAmount > 0" :style="styles.financialRow" :wrap="false">
        <Text :style="{ ...styles.colLeftSpan, color: '#888888', fontSize: 12 }">{{ discountLabel }}</Text>
        <Text :style="{ ...styles.colAmount, color: '#888888' }">- {{ formatCurrency(discountAmount) }}</Text>
      </View>

      <View v-if="taxAmount > 0" :style="styles.financialRow" :wrap="false">
        <Text :style="{ ...styles.colLeftSpan, fontSize: 12 }">{{ taxLabel }}</Text>
        <Text :style="styles.colAmount">{{ formatCurrency(taxAmount) }}</Text>
      </View>

      <View :style="{ ...styles.financialTotalRow, backgroundColor: organizationColorAccent + '33' }" :wrap="false">
        <Text :style="{ ...styles.colLeftSpan, fontWeight: 'bold', fontSize: 16 }">Total</Text>
        <Text :style="{ ...styles.colAmount, fontSize: 16 }">{{
          grandTotal.toLocaleString('en-IN', {
            style: 'currency',
            currency: 'INR',
          })
        }}</Text>
      </View>

      <View :style="styles.accountBox" :wrap="false">
        <View :style="{ ...styles.accountCol, flex: 6 }">
          <Text :style="styles.accountLabel">Account Name</Text>
          <Text :style="styles.accountValue">{{ accountName }}</Text>
        </View>
        <View :style="{ ...styles.accountCol, flex: 4 }">
          <Text :style="styles.accountLabel">Account Number</Text>
          <Text :style="styles.accountValue">{{ accountNumber }}</Text>
        </View>
        <View :style="{ ...styles.accountCol, flex: 3 }">
          <Text :style="styles.accountLabel">Bank Name</Text>
          <Text :style="styles.accountValue">{{ bankName }}</Text>
        </View>
        <View :style="{ ...styles.accountCol, flex: 3 }">
          <Text :style="styles.accountLabel">IFSC Code</Text>
          <Text :style="styles.accountValue">{{ ifscCode }}</Text>
        </View>
      </View>
    </Page>

    <Page size="A4" :style="[styles.page, { fontFamily: organizationFont }]">
      <View fixed :style="styles.pageFooter">
        <Image :src="organizationLogo" :style="{ position: 'absolute', left: -65, bottom: -65, width: 180, height: 180 }" />
        <View :style="{ position: 'absolute', left: -65, bottom: -65, width: 180, height: 180, backgroundColor: 'white', opacity: 0.8 }"> </View>
        <Text :style="styles.pageFooterText">Signature: ______________________</Text>
      </View>

      <Text :style="{ ...styles.sectionTitle, marginBottom: 24 }">TERMS & CONDITIONS</Text>
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
        I, <Text>{{ clientName }}</Text
        >, accept the agreement structure and choose to execute the project under the terms and conditions detailed above.
      </Text>
      <View :style="styles.accGridHeader">
        <Text :style="styles.accCol">For {{ organizationName }}</Text>
        <Text :style="styles.accCol">For Client</Text>
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

      <Text :render="(ctx) => `N.B: This Letter consists of ${ctx.totalPages} pages including this one. Please sign on all pages.`" :style="styles.accNote"></Text>
    </Page>
  </Document>
</template>
