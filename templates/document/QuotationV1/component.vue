<script setup lang="ts">
import { Document, Page, View, Text, Image } from '@ceereals/vue-pdf'

const props = defineProps<{
  branding: { logo: string; font: string; color: { primary: string; accent: string } }
  company: { name: string; address: string }
  client: { name: string; address: string }
  contact: { phone: string; email: string }
  shoot: { date: string; address: string }
  project: { title: string; quoteNumber: string; issuedDate: string; expiryDate: string }
  deliverables: { title: string; points: string[]; amount: string }[]
  financials: { subtotal: string; discountLabel: string; discountAmount: string; totalCost: string }
  accountDetails: { accountName: string; accountNumber: string; bankName: string; ifscCode: string }
  parsedTerms: { type: string; text?: string; items?: string[] }[]
}>()

const styles = {
  page: { padding: '40 40 120 40', fontSize: 12, color: '#1a1a1a', lineHeight: 1.4 },
  footer: { position: 'absolute' as const, bottom: 40, left: 40, right: 40, flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  footerText: { fontSize: 12, fontWeight: 'bold' as const },
  headerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 30 },
  logoSection: { width: '45%' },
  metaSection: { width: '45%' },
  titleContainer: { marginBottom: 15 },
  metaGridRow: { flexDirection: 'row' as const, width: '100%', marginTop: 6 },
  metaGridLabel: { width: 100, fontWeight: 'bold' as const, fontSize: 12 },
  metaGridValue: { flex: 1, fontSize: 12 },
  infoBanner: { flexDirection: 'row' as const, padding: '15 20', marginBottom: 30 },
  bannerCol: { flex: 1, paddingRight: 10 },
  labelBold: { fontWeight: 'bold' as const, marginBottom: 4, fontSize: 12 },
  sectionTitle: { fontSize: 24, fontWeight: 'bold' as const, marginBottom: 15 },
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
  financialTotalRow: { flexDirection: 'row' as const, padding: '12 20', marginTop: 15 },
  accountBox: { flexDirection: 'row' as const, marginTop: 40, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#eee' },
  accountCol: { flex: 1, paddingRight: 10 },
  accountLabel: { fontWeight: 'bold' as const, fontSize: 12, marginBottom: 4 },
  accountValue: { fontSize: 12, color: '#555' },
  termHeading: { fontSize: 16, fontWeight: 'bold' as const, marginTop: 20, marginBottom: 8, color: '#000' },
  termParagraph: { marginBottom: 10, color: '#444', fontSize: 12 },
  acceptanceTitle: { fontSize: 24, fontWeight: 'bold' as const, textAlign: 'center' as const, marginBottom: 20 },
  acceptanceSub: { fontSize: 12, marginBottom: 40 },
  accGridHeader: { flexDirection: 'row' as const, backgroundColor: '#f2f2f2', padding: '12 20', fontWeight: 'bold' as const, marginBottom: 20 },
  accGridRow: { flexDirection: 'row' as const, padding: '0 20', marginBottom: 25 },
  accCol: { flex: 1, fontSize: 12 },
  accNote: { fontSize: 12, color: '#555', marginTop: 50, textAlign: 'center' as const },
}
</script>

<template>
  <Document>
    <Page size="A4" :style="[styles.page, { fontFamily: branding.font }]">
      <View fixed :style="styles.footer">
        <Text :style="styles.footerText">Signature: ________________________</Text>
        <Text :render="(ctx: any) => `Page ${ctx.pageNumber} of ${ctx.totalPages}`" :style="styles.footerText" />
      </View>

      <View :style="styles.headerRow">
        <View :style="styles.logoSection">
          <Image :src="branding.logo" :style="{ width: 100, marginBottom: 15 }" />
          <Text :style="{ fontWeight: 'bold', fontSize: 14 }">{{ company.name || ' ' }}</Text>
          <Text :style="{ color: '#555', marginTop: 4, fontSize: 12 }">{{ company.address || ' ' }}</Text>
        </View>

        <View :style="styles.metaSection">
          <View :style="styles.titleContainer">
            <Text :style="{ fontSize: 24, fontWeight: 'bold' }">{{ project.title || 'Quotation' }}</Text>
            <Text :style="{ fontSize: 16, fontWeight: 'bold', color: branding.color.primary }">Quotation</Text>
          </View>

          <View :style="styles.metaGridRow">
            <Text :style="[styles.metaGridLabel, { color: branding.color.primary }]">Quote nr.</Text>
            <Text :style="styles.metaGridValue">{{ project.quoteNumber || ' ' }}</Text>
          </View>
          <View :style="styles.metaGridRow">
            <Text :style="[styles.metaGridLabel, { color: branding.color.primary }]">Issued</Text>
            <Text :style="styles.metaGridValue">{{ project.issuedDate || ' ' }}</Text>
          </View>
          <View :style="styles.metaGridRow">
            <Text :style="[styles.metaGridLabel, { color: branding.color.primary }]">Expiry</Text>
            <Text :style="styles.metaGridValue">{{ project.expiryDate || ' ' }}</Text>
          </View>
        </View>
      </View>

      <View :style="[styles.infoBanner, { backgroundColor: branding.color.accent || '#faebeb' }]">
        <View :style="styles.bannerCol">
          <Text :style="[styles.labelBold, { color: branding.color.primary }]">Bill to</Text>
          <Text :style="{ fontSize: 12 }">{{ client.name || ' ' }}</Text>
          <Text :style="{ fontSize: 12 }">{{ client.address || ' ' }}</Text>
        </View>
        <View :style="styles.bannerCol">
          <Text :style="[styles.labelBold, { color: branding.color.primary }]">Contact Details</Text>
          <Text :style="{ fontSize: 12 }">Phone No: {{ contact.phone || ' ' }}</Text>
          <Text :style="{ fontSize: 12 }">Email: {{ contact.email || ' ' }}</Text>
        </View>
        <View :style="styles.bannerCol">
          <Text :style="[styles.labelBold, { color: branding.color.primary }]">Shoot Details</Text>
          <Text :style="{ fontSize: 12 }">Date: {{ shoot.date || ' ' }}</Text>
          <Text :style="{ fontSize: 12 }">Address: {{ shoot.address || ' ' }}</Text>
        </View>
      </View>

      <Text :style="styles.sectionTitle">DELIVERABLES</Text>
      <View :style="styles.tableHeader">
        <Text :style="styles.colName">Name of service</Text>
        <Text :style="[styles.colDesc, { fontWeight: 'bold', fontSize: 12 }]">Description</Text>
        <Text :style="styles.colAmount">Amount</Text>
      </View>

      <View v-for="(item, index) in deliverables" :key="index" :style="styles.tableRow" :wrap="false">
        <Text :style="styles.colName">{{ item.title || ' ' }}</Text>
        <View :style="styles.colDesc">
          <View v-for="(point, pIndex) in item.points" :key="pIndex" :style="styles.bulletRow">
            <Text :style="styles.bullet">•</Text>
            <Text :style="styles.bulletText">{{ point || ' ' }}</Text>
          </View>
        </View>
        <Text :style="styles.colAmount">{{ item.amount || '0' }}</Text>
      </View>

      <View :style="styles.financialRow" :wrap="false">
        <Text :style="[styles.colLeftSpan, { fontWeight: 'bold', fontSize: 12 }]">Subtotal</Text>
        <Text :style="styles.colAmount">{{ financials.subtotal || '0' }}</Text>
      </View>
      <View v-if="financials.discountAmount" :style="styles.financialRow" :wrap="false">
        <Text :style="[styles.colLeftSpan, { color: '#888', fontSize: 12 }]">{{ financials.discountLabel || 'Discount' }}</Text>
        <Text :style="[styles.colAmount, { color: '#888' }]">{{ financials.discountAmount || '0' }}</Text>
      </View>
      <View :style="[styles.financialTotalRow, { backgroundColor: branding.color.accent || '#faebeb' }]" :wrap="false">
        <Text :style="[styles.colLeftSpan, { fontWeight: 'bold', fontSize: 16 }]">Total</Text>
        <Text :style="[styles.colAmount, { fontSize: 16 }]">{{ financials.totalCost || '0' }}</Text>
      </View>

      <View :style="styles.accountBox" :wrap="false">
        <View :style="styles.accountCol">
          <Text :style="styles.accountLabel">Account Name</Text>
          <Text :style="styles.accountValue">{{ accountDetails.accountName || ' ' }}</Text>
        </View>
        <View :style="styles.accountCol">
          <Text :style="styles.accountLabel">Account Number</Text>
          <Text :style="styles.accountValue">{{ accountDetails.accountNumber || ' ' }}</Text>
        </View>
        <View :style="styles.accountCol">
          <Text :style="styles.accountLabel">Bank Name</Text>
          <Text :style="styles.accountValue">{{ accountDetails.bankName || ' ' }}</Text>
        </View>
        <View :style="styles.accountCol">
          <Text :style="styles.accountLabel">IFSC Code</Text>
          <Text :style="styles.accountValue">{{ accountDetails.ifscCode || ' ' }}</Text>
        </View>
      </View>
    </Page>

    <Page size="A4" :style="[styles.page, { fontFamily: branding.font }]">
      <View fixed :style="styles.footer">
        <Text :style="styles.footerText">Signature: ________________________</Text>
        <Text :render="(ctx: any) => `Page ${ctx.pageNumber} of ${ctx.totalPages}`" :style="styles.footerText" />
      </View>

      <Text :style="styles.sectionTitle">TERMS & CONDITIONS</Text>
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

    <Page size="A4" :style="[styles.page, { fontFamily: branding.font }]">
      <View fixed :style="[styles.footer, { flexDirection: 'row-reverse' }]">
        <Text :render="(ctx: any) => `Page ${ctx.pageNumber} of ${ctx.totalPages}`" :style="styles.footerText" />
      </View>

      <Text :style="styles.acceptanceTitle">Acceptance of Quotation</Text>
      <Text :style="styles.acceptanceSub"> I, ____________________________________________________, accept the quotation and agree to the terms and conditions stated above. </Text>

      <View :style="styles.accGridHeader">
        <Text :style="styles.accCol">For RED CAT PICTURES</Text>
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

      <Text :render="(ctx: any) => `N.B: This Letter consists of ${ctx.totalPages} pages including this one. Please sign on all pages.`" :style="styles.accNote" />
    </Page>
  </Document>
</template>
