<script setup lang="ts">
import { Document, Page, View, Text, Image } from '@ceereals/vue-pdf'

const props = defineProps<{
  organizationName: string
  organizationAddress: string
  organizationLogo: string
  organizationFont: string
  organizationColorPrimary: string
  organizationColorAccent: string
  agreementDate: string
  contractorName: string
  contractorTitle: string
  projectName: string
  shootDates: string
  location: string
  callTime: string
  deliverables: string[]
  totalAmount: number
  expiresIn: string
}>()

const styles = {
  page: { padding: '40 40 120 40', fontSize: 12, color: '#1A1A1A', lineHeight: 1.4, fontStyle: 'normal' as const },
  headerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 30 },
  logoSection: { width: '50%' },
  metaSection: { width: '50%', alignItems: 'flex-end' as const },
  titleContainer: { marginBottom: 15, alignItems: 'flex-end' as const },
  documentTitle: { fontSize: 24, color: props.organizationColorAccent, fontWeight: 'bold' as const },
  documentSubtitle: { fontSize: 12, marginTop: 16 },
  metaGridRow: { flexDirection: 'row' as const, width: 160, marginTop: 6 },
  metaGridLabel: { width: 80, fontWeight: 'bold' as const, fontSize: 12 },
  metaGridValue: { flex: 1, fontSize: 12 },
  infoBanner: { flexDirection: 'row' as const, marginHorizontal: -40, padding: '15 40', marginBottom: 25 },
  bannerCol: { flex: 1, paddingRight: 10 },
  labelBold: { fontWeight: 'bold' as const, marginBottom: 4, fontSize: 12 },
  introText: { fontSize: 11, marginBottom: 15 },
  bold: { fontWeight: 'bold' as const, color: '#000000' },
  section: { marginBottom: 15 },
  sectionHeader: { fontSize: 12, color: props.organizationColorPrimary, marginBottom: 8, textTransform: 'uppercase' as const, fontWeight: 'bold' as const },
  paragraph: { marginBottom: 8 },
  list: { marginLeft: 10, marginTop: 5, marginBottom: 10 },
  listItem: { flexDirection: 'row' as const, marginBottom: 4 },
  bullet: { width: 15, color: props.organizationColorPrimary },
  pageFooter: { position: 'absolute' as const, bottom: 40, left: 40, right: 40, flexDirection: 'row' as const, justifyContent: 'flex-end' as const, paddingTop: 10 },
  pageFooterText: { fontSize: 12, color: '#888888' },
  footer: { position: 'absolute' as const, bottom: 40, left: 40, right: 40, flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  footerText: { fontSize: 12, fontWeight: 'bold' as const },
  acceptanceTitle: { fontSize: 24, fontWeight: 'bold' as const, textAlign: 'center' as const, marginBottom: 20, marginTop: 20 },
  acceptanceSub: { fontSize: 12, marginBottom: 20 },
  accGridHeader: { flexDirection: 'row' as const, backgroundColor: props.organizationColorAccent + '1A', marginHorizontal: -40, padding: '12 40', fontWeight: 'bold' as const, marginBottom: 20 },
  accGridRow: { flexDirection: 'row' as const, padding: '0 0', marginBottom: 30 },
  accCol: { flex: 1, fontSize: 12 },
  accNote: { fontSize: 12, color: '#555', marginTop: 50, textAlign: 'center' as const },
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
        <View :style="styles.logoSection">
          <Image :src="organizationLogo" :style="{ width: 80, height: 80, marginBottom: 15 }" />
          <Text :style="{ fontWeight: 'bold', fontSize: 16 }">{{ organizationName }}</Text>
          <Text :style="{ color: '#555', marginTop: 4, fontSize: 12 }">{{ organizationAddress }}</Text>
        </View>

        <View :style="styles.metaSection">
          <View :style="styles.titleContainer">
            <Text :style="styles.documentTitle">Contractor Agreement</Text>
            <Text :style="styles.documentSubtitle">Photography & Videography</Text>
          </View>

          <View :style="styles.metaGridRow">
            <Text :style="{ ...styles.metaGridLabel, color: organizationColorPrimary }">Date</Text>
            <Text :style="styles.metaGridValue">
              {{
                new Date(agreementDate).toLocaleDateString('en-IN', {
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
          <Text :style="{ ...styles.labelBold, color: organizationColorPrimary }">Service Provider</Text>
          <Text :style="{ fontSize: 12 }">{{ contractorName }}</Text>
          <Text :style="{ fontSize: 12 }">{{ contractorTitle }}</Text>
        </View>
        <View :style="styles.bannerCol">
          <Text :style="{ ...styles.labelBold, color: organizationColorPrimary }">Project Details</Text>
          <Text :style="{ fontSize: 12 }">{{ projectName }}</Text>
          <Text :style="{ fontSize: 12 }">
            Date:
            {{
              new Date(shootDates).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            }}
          </Text>
        </View>
        <View :style="styles.bannerCol">
          <Text :style="{ ...styles.labelBold, color: organizationColorPrimary }">Logistics</Text>
          <Text :style="{ fontSize: 12 }">{{ location }}</Text>
          <Text :style="{ fontSize: 12 }">
            Call Time:
            {{
              new Date(callTime).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            }}
          </Text>
        </View>
      </View>

      <Text :style="styles.introText">
        This Agreement is entered into as of
        <Text :style="styles.bold">
          {{
            new Date(agreementDate).toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          }} </Text
        >, by and between <Text :style="styles.bold">{{ organizationName }}</Text> ("Company") and <Text :style="styles.bold">{{ contractorName }}</Text> ("Service Provider").
      </Text>

      <View :style="styles.section">
        <Text :style="styles.sectionHeader">1. Scope of Work & Deliverables</Text>
        <Text :style="styles.paragraph">The Service Provider agrees to provide photography and/or videography services for the project detailed above, including the following deliverables:</Text>

        <View :style="styles.list">
          <View v-for="(item, index) in deliverables" :key="index" :style="styles.listItem">
            <Text>• {{ item }}</Text>
          </View>
        </View>
      </View>

      <View :style="styles.section">
        <Text :style="styles.sectionHeader">2. Compensation & Payment Terms</Text>
        <Text :style="styles.paragraph"
          >The Company agrees to pay the Service Provider a total fee of <Text :style="styles.bold">{{ totalAmount }}</Text> for the services described above.</Text
        >
        <View :style="styles.list">
          <View :style="styles.listItem">
            <Text
              >•<Text :style="styles.bold">Balance:</Text> After the Company receives the final payment amount from the client, the agreed payment will be given to the Service Provider within 2-3
              business days.</Text
            >
          </View>
          <View :style="styles.listItem">
            <Text
              >•<Text :style="styles.bold">Expenses:</Text> The Company shall not reimburse the Service Provider for out-of-pocket expenses (e.g., travel, parking, equipment rentals) incurred during
              the project if not decided formally via mail or other channel.</Text
            >
          </View>
        </View>
      </View>

      <View :style="styles.section">
        <Text :style="styles.sectionHeader">3. Copyright & Ownership (Work Made for Hire)</Text>
        <Text :style="styles.paragraph">All photographs, videos, raw files, and deliverables created by the Service Provider under this Agreement shall be considered a "work made for hire."</Text>
        <View :style="styles.list">
          <View :style="styles.listItem">
            <Text
              >•<Text :style="styles.bold">Company Rights:</Text> {{ organizationName }} shall be the exclusive owner of all rights, titles, and interests in the media, including all copyrights. The
              Company has the unrestricted right to use, edit, distribute, and publish the media across all platforms globally and in perpetuity.</Text
            >
          </View>
          <View :style="styles.listItem">
            <Text
              >•<Text :style="styles.bold">Portfolio Rights:</Text> The Service Provider may use the final, publicly released media for their personal portfolio, website, and social media promotion,
              provided they credit the Company and the Company gave them permission to do so.</Text
            >
          </View>
        </View>
      </View>

      <View :style="styles.section">
        <Text :style="styles.sectionHeader">4. Cancellation & Rescheduling</Text>
        <Text :style="styles.paragraph"
          ><Text :style="styles.bold">By the Company:</Text> If the Company cancels the shoot within 48 hours of the scheduled call time, the Service Provider shall not be entitled to the balance. If
          rescheduled, the terms will apply to the new date.</Text
        >
        <Text :style="styles.paragraph"
          ><Text :style="styles.bold">By the Service Provider:</Text> If the Service Provider is unable to perform the services due to illness or emergency, they must notify the Company immediately
          and make reasonable efforts to secure a replacement of equal skill.</Text
        >
      </View>

      <View :style="styles.section">
        <Text :style="styles.sectionHeader">5. Independent Contractor Status</Text>
        <Text :style="styles.paragraph"
          >The Service Provider is an independent contractor. Nothing in this Agreement shall be construed to create an employer-employee relationship, partnership, or joint venture. The Service
          Provider is solely responsible for their own taxes, insurance, and equipment maintenance.</Text
        >
      </View>

      <View :style="styles.section">
        <Text :style="styles.sectionHeader">6. Liability & Indemnification</Text>
        <Text :style="styles.paragraph"
          ><Text :style="styles.bold">Data Loss:</Text> The Service Provider shall implement standard backup protocols (e.g., dual memory card recording). In the unlikely event of total media failure
          or loss of footage due to equipment malfunction, the Service Provider's liability shall be limited to the forfeiture of the agreed fee.</Text
        >
        <Text :style="styles.paragraph"
          ><Text :style="styles.bold">Indemnity:</Text> The Service Provider agrees to indemnify and hold harmless the Company from any claims, damages, or liabilities arising out of the Service
          Provider's negligence or breach of this Agreement.</Text
        >
      </View>
    </Page>

    <Page size="A4" :style="[styles.page, { fontFamily: organizationFont }]">
      <View fixed :style="[styles.footer, { flexDirection: 'row-reverse' }]">
        <Image :src="organizationLogo" :style="{ position: 'absolute', left: -65, bottom: -65, width: 180, height: 180 }" />
        <View :style="{ position: 'absolute', left: -65, bottom: -65, width: 180, height: 180, backgroundColor: 'white', opacity: 0.8 }"> </View>
        <!-- <Text :render="(ctx) => `Page ${ctx.pageNumber} of ${ctx.totalPages}`" :style="styles.footerText" /> -->
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

      <!-- <Text
        :render="(ctx) => `N.B: This Agreement consists of ${ctx.totalPages} pages including this one. Please initial and sign where indicated.`"
        :style="styles.accNote"></Text> -->
    </Page>
  </Document>
</template>
