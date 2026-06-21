<script setup lang="ts">
import { Document, Page, View, Text, Image } from '@ceereals/vue-pdf'

const props = defineProps<{
  organizationName: string
  organizationAddress: string
  organizationLogo: string
  organizationFont: string
  organizationColorPrimary: string
  organizationColorAccent: string
  clientName: string
  clientAddress: string
  contactPhone: string
  contactEmail: string
  shootDate: string
  shootAddress: string
  projectTitle: string
  projectQuoteNumber: string
  projectIssuedDate: string
  projectExpiryDate: string
  deliverables: { title: string; points: string[]; amount: string }[]
  financialsSubtotal: number
  financialsDiscountLabel: string
  financialsDiscountAmount: string
  financialsTotalCost: number
  accountName: string
  accountNumber: number
  bankName: string
  ifscCode: string
  parsedTerms: { type: string; text?: string; items?: string[] }[]
}>()

const styles = {
  page: { padding: '40 40 120 40', fontSize: 12, color: '#1a1a1a', lineHeight: 1.4, fontStyle: 'normal' as const },
  headerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 30 },
  logoSection: { width: '50%' },
  metaSection: { width: '50%', alignItems: 'flex-end' as const },
  pageFooter: { position: 'absolute' as const, bottom: 40, left: 40, right: 40, flexDirection: 'row' as const, justifyContent: 'flex-end' as const, paddingTop: 10 },
  pageFooterText: { fontSize: 12, color: '#888888' },
  footer: { position: 'absolute' as const, bottom: 40, left: 40, right: 40, flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  footerText: { fontSize: 12, fontWeight: 'bold' as const },
  titleContainer: { marginBottom: 15, alignItems: 'flex-end' as const },
  metaGridRow: { flexDirection: 'row' as const, width: 160, marginTop: 6 },
  metaGridLabel: { width: 80, fontWeight: 'bold' as const, fontSize: 12 },
  metaGridValue: { flex: 1, fontSize: 12 },
  infoBanner: { flexDirection: 'row' as const, marginHorizontal: -40, padding: '15 40' },
  bannerCol: { flex: 1, paddingRight: 10 },
  labelBold: { fontWeight: 'bold' as const, marginBottom: 4, fontSize: 12 },
  sectionTitle: { fontSize: 24, textAlign: 'center' as const, fontWeight: 'bold' as const },
  tableHeader: { flexDirection: 'row' as const, borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 8, marginBottom: 12 },
  tableRow: { flexDirection: 'row' as const, borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 12 },
  colName: { flex: 2, paddingRight: 10, fontWeight: 'bold' as const, fontSize: 12 },
  colDesc: { flex: 4, paddingRight: 10 },
  colAmount: { flex: 1.5, textAlign: 'right' as const, fontWeight: 'bold' as const, fontSize: 12 },
  colLeftSpan: { flex: 6, paddingRight: 20 },
  bulletRow: { flexDirection: 'row' as const, marginBottom: 6 },
  bullet: { width: 12, color: '#555', fontSize: 12 },
  bulletText: { flex: 1, color: '#555', fontSize: 12, lineHeight: 1.4 },
  financialRow: { flexDirection: 'row' as const, marginTop: 10 },
  financialTotalRow: { flexDirection: 'row' as const, marginHorizontal: -40, padding: '12 40', marginTop: 15 },
  accountBox: { flexDirection: 'row' as const, marginTop: 40, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#eee' },
  accountCol: { flex: 1, paddingRight: 10 },
  accountLabel: { fontWeight: 'bold' as const, fontSize: 12, marginBottom: 4 },
  accountValue: { fontSize: 12, color: '#555' },
  termHeading: { fontSize: 16, fontWeight: 'bold' as const, marginTop: 20, marginBottom: 8, color: '#000' },
  termParagraph: { color: '#444', fontSize: 12 },
  acceptanceTitle: { fontSize: 24, fontWeight: 'bold' as const, textAlign: 'center' as const, marginBottom: 20, marginTop: 20 },
  acceptanceSub: { fontSize: 12, marginBottom: 20 },
  accGridHeader: { flexDirection: 'row' as const, backgroundColor: props.organizationColorAccent + '1A', marginHorizontal: -40, padding: '12 40', fontWeight: 'bold' as const, marginBottom: 20 },
  accGridRow: { flexDirection: 'row' as const, padding: '0 0', marginBottom: 30 },
  accCol: { flex: 1, fontSize: 12 },
  accNote: { fontSize: 12, color: '#555', marginTop: 50, textAlign: 'center' as const },
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
        <View :style="styles.logoSection">
          <Image :src="organizationLogo" :style="{ width: 80, height: 80, marginBottom: 15 }" />
          <Text :style="{ fontWeight: 'bold', fontSize: 16 }">{{ organizationName }}</Text>
          <Text :style="{ color: '#555', marginTop: 4, fontSize: 12 }">{{ organizationAddress }}</Text>
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
              {{
                new Date(projectIssuedDate).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              }}
            </Text>
          </View>
          <View :style="styles.metaGridRow">
            <Text :style="{ ...styles.metaGridLabel, color: organizationColorPrimary }">Expiry</Text>
            <Text :style="styles.metaGridValue">
              {{
                new Date(projectExpiryDate).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              }}
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
            {{
              new Date(shootDate).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            }}
          </Text>
          <Text :style="{ fontSize: 12 }">Address: {{ shootAddress }}</Text>
        </View>
      </View>

      <Text :style="{ ...styles.sectionTitle, marginTop: 24, marginBottom: 32 }">DELIVERABLES</Text>
      <View :style="styles.tableHeader">
        <Text :style="styles.colName">Name of service</Text>
        <Text :style="{ ...styles.colDesc, fontWeight: 'bold', fontSize: 12 }">Description</Text>
        <Text :style="styles.colAmount">Amount</Text>
      </View>

      <View v-for="(item, index) in deliverables" :key="index" :style="styles.tableRow" :wrap="false">
        <Text :style="styles.colName">{{ item.title }}</Text>
        <View :style="styles.colDesc">
          <View v-for="(point, pIndex) in item.points" :key="pIndex" :style="styles.bulletRow">
            <Text :style="styles.bullet">•</Text>
            <Text :style="styles.bulletText">{{ point }}</Text>
          </View>
        </View>
        <Text :style="styles.colAmount">{{ item.amount }}</Text>
      </View>

      <View :style="styles.financialRow" :wrap="false">
        <Text :style="{ ...styles.colLeftSpan, fontWeight: 'bold', fontSize: 12 }">Subtotal</Text>
        <Text :style="styles.colAmount">{{ financialsSubtotal }}</Text>
      </View>
      <View v-if="financialsDiscountAmount" :style="styles.financialRow" :wrap="false">
        <Text :style="{ ...styles.colLeftSpan, color: '#888', fontSize: 12 }">{{ financialsDiscountLabel }}</Text>
        <Text :style="{ ...styles.colAmount, color: '#888' }">{{ financialsDiscountAmount }}</Text>
      </View>
      <View :style="{ ...styles.financialTotalRow, backgroundColor: organizationColorAccent + '33' }" :wrap="false">
        <Text :style="{ ...styles.colLeftSpan, fontWeight: 'bold', fontSize: 16 }">Total</Text>
        <Text :style="{ ...styles.colAmount, fontSize: 16 }">{{ financialsTotalCost }}</Text>
      </View>

      <View :style="styles.accountBox" :wrap="false">
        <View :style="styles.accountCol">
          <Text :style="styles.accountLabel">Account Name</Text>
          <Text :style="styles.accountValue">{{ accountName }}</Text>
        </View>
        <View :style="styles.accountCol">
          <Text :style="styles.accountLabel">Account Number</Text>
          <Text :style="styles.accountValue">{{ accountNumber }}</Text>
        </View>
        <View :style="styles.accountCol">
          <Text :style="styles.accountLabel">Bank Name</Text>
          <Text :style="styles.accountValue">{{ bankName }}</Text>
        </View>
        <View :style="styles.accountCol">
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

      <Text :style="{ ...styles.sectionTitle, marginBottom: 40 }">TERMS & CONDITIONS</Text>
      <View v-for="(block, bIndex) in parsedTerms" :key="bIndex" :wrap="false">
        <Text v-if="block.type === 'heading'" :style="styles.termHeading">{{ block.text }}</Text>
        <Text v-if="block.type === 'paragraph'" :style="styles.termParagraph">{{ block.text }}</Text>

        <View v-if="block.type === 'list'">
          <View v-for="(item, iIndex) in block.items" :key="iIndex" :style="styles.bulletRow">
            <Text :style="styles.bullet">-</Text>
            <Text :style="styles.bulletText">{{ item }}</Text>
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

      <Text :render="(ctx) => `N.B: This Letter consists of ${ctx.totalPages} pages including this one. Please sign on all pages.`" :style="styles.accNote"></Text>
    </Page>
  </Document>
</template>
