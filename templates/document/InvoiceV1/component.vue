<script setup lang="ts">
import { Document, Page, View, Text, Image } from '@ceereals/vue-pdf'

const props = defineProps<{
  pricingModel: 'project' | 'day'
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
  projectTitle: string
  projectInvoiceNumber: string
  projectQuotationNumber: string
  projectIssuedDate: string
  dueDate: string
  deliverables: { title: string; description: string; points: string[]; rate: number; quantity: number; amount: number }[]
  financialsSubtotal: number
  financialsDiscountLabel: string
  financialsDiscountAmount: string
  financialsTaxLabel: string
  financialsTaxAmount: string
  financialsGrandTotal: number
  financialsAmountPaid: string
  financialsAmountDue: number
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIALLY PAID'
  accountName: string
  accountNumber: number
  bankName: string
  ifscCode: string
}>()

const styles = {
  page: { padding: '40 40 120 40', fontSize: 12, color: '#1A1A1A', lineHeight: 1.4, fontStyle: 'normal' as const },
  headerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 30 },
  logoSection: { width: '50%' },
  metaSection: { width: '50%', alignItems: 'flex-end' as const },
  pageFooter: { position: 'absolute' as const, bottom: 40, left: 40, right: 40, flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingTop: 10 },
  pageFooterText: { fontSize: 12, color: '#888888', fontWeight: 'bold' as const },
  titleContainer: { marginBottom: 15, alignItems: 'flex-end' as const },
  metaGridRow: { flexDirection: 'row' as const, width: 160, marginTop: 6 },
  metaGridLabel: { width: 80, fontWeight: 'bold' as const, fontSize: 12 },
  metaGridValue: { flex: 1, fontSize: 12, textAlign: 'right' as const },
  infoBanner: { flexDirection: 'row' as const, marginHorizontal: -40, padding: '15 40' },
  bannerCol: { flex: 1, paddingRight: 10 },
  labelBold: { fontWeight: 'bold' as const, marginBottom: 4, fontSize: 12 },
  sectionTitle: { fontSize: 24, textAlign: 'center' as const, fontWeight: 'bold' as const },
  tableHeader: { flexDirection: 'row' as const, borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 8, marginBottom: 12 },
  tableRow: { flexDirection: 'row' as const, borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 12 },
  colName: { flex: 2, paddingRight: 10, fontWeight: 'bold' as const, fontSize: 12 },
  colDesc: { flex: 3.5, paddingRight: 10 },
  colRate: { flex: 1.5, textAlign: 'right' as const, fontSize: 12 },
  colQty: { flex: 1, textAlign: 'center' as const, fontSize: 12 },
  colAmount: { flex: 1.5, textAlign: 'right' as const, fontWeight: 'bold' as const, fontSize: 12 },
  colLeftSpan: { flex: 8, paddingRight: 20 },
  bulletRow: { flexDirection: 'row' as const, marginBottom: 6 },
  bullet: { width: 12, color: '#555', fontSize: 12 },
  bulletText: { flex: 1, color: '#555', fontSize: 12, lineHeight: 1.4 },
  financialRow: { flexDirection: 'row' as const, marginTop: 10 },
  financialTotalRow: { flexDirection: 'row' as const, marginHorizontal: -40, padding: '12 40', marginTop: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  financialDueRow: { flexDirection: 'row' as const, marginHorizontal: -40, padding: '12 40' },
  accountBox: { flexDirection: 'row' as const, marginTop: 40, paddingTop: 20 },
  accountCol: { paddingRight: 10, whitespace: 'nowrap' as const },
  accountLabel: { fontWeight: 'bold' as const, fontSize: 12, marginBottom: 4 },
  accountValue: { fontSize: 12, color: '#555' },
  stampContainer: { position: 'absolute' as const, top: 500, left: 0, right: 0, alignItems: 'center' as const, zIndex: -1 },
  stampText: { fontSize: 64, fontWeight: 'bold' as const, opacity: 0.3, whitespace: 'nowrap', transform: 'rotate(-45deg)' },
  systemNoticeText: { fontSize: 12, color: '#888888', textAlign: 'right' as const, width: '100%' },
}
</script>

<template>
  <Document title="Invoice" :author="organizationName" creator="Modest Human Brands" producer="MDoc">
    <Page size="A4" :style="[styles.page, { fontFamily: organizationFont }]">
      <View :style="styles.stampContainer" fixed>
        <Text
          :style="[
            styles.stampText,
            {
              color: paymentStatus === 'PAID' ? '#22c55e' : paymentStatus === 'PARTIALLY PAID' ? '#eab308' : '#ef4444',
            },
          ]">
          {{ paymentStatus }}
        </Text>
      </View>

      <View fixed :style="styles.pageFooter">
        <Image :src="organizationLogo" :style="{ position: 'absolute', left: -65, bottom: -65, width: 180, height: 180 }" />
        <View :style="{ position: 'absolute', left: -65, bottom: -65, width: 180, height: 180, backgroundColor: 'white', opacity: 0.8 }"> </View>
        <Text :style="styles.systemNoticeText"> This is a computer generated electronic invoice. </Text>
      </View>

      <View :style="styles.headerRow">
        <View :style="styles.logoSection">
          <Image :src="organizationLogo" :style="{ width: 80, height: 80, marginBottom: 15 }" />
          <Text :style="{ fontWeight: 'bold', fontSize: 16 }">{{ organizationName }}</Text>
          <Text :style="{ color: '#555', marginTop: 4, fontSize: 12 }">{{ organizationAddress }}</Text>
        </View>

        <View :style="styles.metaSection">
          <View :style="styles.titleContainer">
            <Text :style="{ fontSize: 24, color: props.organizationColorAccent, fontWeight: 'bold' as const }">INVOICE</Text>
            <Text :style="{ fontSize: 12, marginTop: 16, textAlign: 'right' }">{{ projectTitle }}</Text>
          </View>

          <View :style="styles.metaGridRow">
            <Text :style="{ ...styles.metaGridLabel, color: organizationColorPrimary }">Invoice nr.</Text>
            <Text :style="styles.metaGridValue">{{ projectInvoiceNumber }}</Text>
          </View>
          <View v-if="projectQuotationNumber" :style="styles.metaGridRow">
            <Text :style="{ ...styles.metaGridLabel, color: organizationColorPrimary }">Quotation nr.</Text>
            <Text :style="styles.metaGridValue">{{ projectQuotationNumber }}</Text>
          </View>
          <View :style="styles.metaGridRow">
            <Text :style="{ ...styles.metaGridLabel, color: organizationColorPrimary }">Date of Issue</Text>
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
            <Text :style="{ ...styles.metaGridLabel, color: organizationColorPrimary }">Due Date</Text>
            <Text :style="styles.metaGridValue">
              {{ new Date(dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) }}
            </Text>
          </View>
        </View>
      </View>

      <View :style="{ ...styles.infoBanner, backgroundColor: organizationColorAccent + '33' }">
        <View :style="styles.bannerCol">
          <Text :style="{ ...styles.labelBold, color: organizationColorPrimary }">Bill to</Text>
          <Text :style="{ fontSize: 12, fontWeight: 'bold' }">{{ clientName }}</Text>
          <Text :style="{ fontSize: 12 }">{{ clientAddress }}</Text>
        </View>
        <View :style="styles.bannerCol">
          <Text :style="{ ...styles.labelBold, color: organizationColorPrimary }">Contact Details</Text>
          <Text :style="{ fontSize: 12 }">Phone No: {{ contactPhone }}</Text>
          <Text :style="{ fontSize: 12 }">Email: {{ contactEmail }}</Text>
        </View>
      </View>

      <Text :style="{ ...styles.sectionTitle, marginTop: 24, marginBottom: 32 }">BILLING BREAKDOWN</Text>
      <View :style="styles.tableHeader">
        <Text :style="styles.colName">{{ pricingModel === 'day' ? 'Role / Phase' : 'Name of Service' }}</Text>
        <Text :style="{ ...styles.colDesc, fontWeight: 'bold', fontSize: 12 }">Description</Text>
        <Text :style="{ ...styles.colRate, fontWeight: 'bold', fontSize: 12 }">{{ pricingModel === 'day' ? 'Day Rate' : 'Unit Price' }}</Text>
        <Text :style="{ ...styles.colQty, fontWeight: 'bold', fontSize: 12 }">{{ pricingModel === 'day' ? 'Days' : 'Qty' }}</Text>
        <Text :style="styles.colAmount">Amount</Text>
      </View>

      <View v-for="(item, index) in deliverables" :key="index" :style="styles.tableRow" :wrap="false">
        <Text :style="styles.colName">{{ item.title }}</Text>
        <View :style="styles.colDesc">
          <View v-if="item.points.length">
            <View v-for="(point, pIndex) in item.points" :key="pIndex" :style="styles.bulletRow">
              <Text :style="styles.bullet">•</Text>
              <Text :style="styles.bulletText">{{ point }}</Text>
            </View>
          </View>
          <View v-else>
            <Text :style="styles.bulletText">{{ item.description }}</Text>
          </View>
        </View>
        <Text :style="styles.colRate">{{ item.rate.toLocaleString('en-IN') }}</Text>
        <Text :style="styles.colQty">{{ item.quantity }}</Text>
        <Text :style="styles.colAmount">{{ item.amount.toLocaleString('en-IN') }}</Text>
      </View>

      <View :style="styles.financialRow" :wrap="false">
        <Text :style="{ ...styles.colLeftSpan, fontWeight: 'bold', fontSize: 12 }">Subtotal</Text>
        <Text :style="styles.colAmount">{{ financialsSubtotal.toLocaleString('en-IN') }}</Text>
      </View>

      <View v-if="financialsDiscountAmount" :style="styles.financialRow" :wrap="false">
        <Text :style="{ ...styles.colLeftSpan, color: '#888', fontSize: 12 }">{{ financialsDiscountLabel }}</Text>
        <Text :style="{ ...styles.colAmount, color: '#888' }">{{ financialsDiscountAmount }}</Text>
      </View>

      <View v-if="financialsTaxAmount" :style="styles.financialRow" :wrap="false">
        <Text :style="{ ...styles.colLeftSpan, fontSize: 12 }">{{ financialsTaxLabel }}</Text>
        <Text :style="styles.colAmount">{{ financialsTaxAmount }}</Text>
      </View>

      <View :style="{ ...styles.financialRow, marginTop: 15 }" :wrap="false">
        <Text :style="{ ...styles.colLeftSpan, fontWeight: 'bold', fontSize: 12 }">Total</Text>
        <Text :style="{ ...styles.colAmount, fontWeight: 'bold' }">{{ financialsGrandTotal.toLocaleString('en-IN') }}</Text>
      </View>

      <View v-if="financialsAmountPaid" :style="styles.financialRow" :wrap="false">
        <Text :style="{ ...styles.colLeftSpan, color: '#00a63e', fontSize: 12 }">Payments Made</Text>
        <Text :style="{ ...styles.colAmount, color: '#00A63E' }">- {{ financialsAmountPaid }}</Text>
      </View>

      <View
        :style="{ ...styles.financialDueRow, backgroundColor: paymentStatus === 'PAID' ? '#22c55e22' : paymentStatus === 'PARTIALLY PAID' ? '#eab30822' : organizationColorAccent + '33' }"
        :wrap="false">
        <Text :style="{ ...styles.colLeftSpan, fontWeight: 'bold', fontSize: 16 }">Amount Due (INR)</Text>
        <Text :style="{ ...styles.colAmount, fontSize: 16 }">₹{{ financialsAmountDue.toLocaleString('en-IN') }}</Text>
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
  </Document>
</template>
