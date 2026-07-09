<script setup lang="ts">
import { Document, Page, View, Text, Image } from '@ceereals/vue-pdf'

const props = defineProps<{
  recipientName: string
  bodyContent: string
  organizationName: string
  organizationLogo: string
  organizationFont: string
  organizationColorPrimary: string
  organizationColorAccent: string
  basePdfBackground: string
}>()

const styles = {
  page: { fontFamily: 'Exo2', position: 'relative' as const, width: '100%', height: '100%' },
  bgImage: { position: 'absolute' as const, top: 0, left: 0, width: 595, height: 841, objectFit: 'fill' as const },

  // New Header Sections
  headerContainer: { position: 'absolute' as const, left: 105, top: 92, width: 386, alignItems: 'center' as const },
  certificateTitle: { fontSize: 64, fontWeight: 'bold' as const, color: '#1a0a00' },
  subtitle: { fontSize: 24, color: '#555555', marginTop: 0 },
  presentedToContainer: { position: 'absolute' as const, left: 105, top: 308, width: 386, alignItems: 'center' as const },
  presentedToText: { fontSize: 14, color: '#555555' },

  recipientContainer: { position: 'absolute' as const, left: 105, top: 332, width: 386, justifyContent: 'center' as const, alignItems: 'center' as const },
  recipientText: { fontFamily: 'IslandMoments', fontSize: 56, color: '#1a0a00', textAlign: 'center' as const },
  bodyContainer: { position: 'absolute' as const, left: 106, top: 418, width: 384 },
  bodyText: { fontSize: 12, color: '#1a1a1a', textAlign: 'center' as const, lineHeight: 1.5 },
  logoContainer: { position: 'absolute' as const, left: 105, top: 600, width: 386, justifyContent: 'center' as const, alignItems: 'center' as const },
  logoImage: { height: 120, width: 120, objectFit: 'contain' as const },
}
</script>

<template>
  <Document title="Internship Completion Certificate" :author="organizationName" creator="Modest Human Brands" producer="MDoc">
    <Page size="A4" orientation="portrait" :style="styles.page">
      <Image :src="basePdfBackground" :style="styles.bgImage" />

      <View :style="styles.headerContainer">
        <Text :style="styles.certificateTitle">CERTIFICATE</Text>
        <Text :style="styles.subtitle">OF INTERNSHIP</Text>
      </View>

      <View :style="styles.presentedToContainer">
        <Text :style="styles.presentedToText">THIS IS PRESENTED TO</Text>
      </View>

      <View :style="styles.recipientContainer">
        <Text :style="styles.recipientText">{{ recipientName }}</Text>
      </View>

      <View :style="styles.bodyContainer">
        <Text :style="styles.bodyText">{{ bodyContent }}</Text>
      </View>

      <View :style="styles.logoContainer">
        <Image :src="organizationLogo" :style="styles.logoImage" />
      </View>
    </Page>
  </Document>
</template>
