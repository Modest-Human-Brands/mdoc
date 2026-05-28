<script setup lang="ts">
import { Document, Page, View, Text, Image } from '@ceereals/vue-pdf'

const props = defineProps<{
  recipientName: string
  bodyContent: string
  dataOfIssue: string
  signerName: string
  signerTitle: string
  signerSignature: string
  basePdfBackground: string
}>()

const styles = {
  page: { fontFamily: 'Exo2', position: 'relative' as const, width: '100%', height: '100%' },
  bgImage: { position: 'absolute' as const, top: 0, left: 0, width: 595, height: 841, objectFit: 'fill' as const },
  recipientContainer: { position: 'absolute' as const, left: 105, top: 332, width: 386, justifyContent: 'center' as const, alignItems: 'center' as const },
  recipientText: { fontFamily: 'IslandMoments', fontSize: 56, color: '#1a0a00', textAlign: 'center' as const },
  bodyContainer: { position: 'absolute' as const, left: 106, top: 418, width: 384 },
  bodyText: { fontSize: 12, color: '#1a1a1a', textAlign: 'center' as const, lineHeight: 1.5 },
  dateContainer: { position: 'absolute' as const, left: 56, top: 673, width: 176, justifyContent: 'center' as const, alignItems: 'center' as const },
  dateText: { fontSize: 12, textAlign: 'center' as const, color: '#1a1a1a' },
  signatureImage: { position: 'absolute' as const, left: 382, top: 604, width: 161, height: 54 },
  titleContainer: { position: 'absolute' as const, left: 370, top: 673, width: 183, justifyContent: 'center' as const, alignItems: 'center' as const },
  titleText: { fontSize: 12, textAlign: 'center' as const, color: '#1a1a1a' },
}
</script>

<template>
  <Document>
    <Page size="A4" orientation="portrait" :style="styles.page">
      <Image :src="basePdfBackground" :style="styles.bgImage" />

      <View :style="styles.recipientContainer">
        <Text :style="styles.recipientText">{{ recipientName }}</Text>
      </View>

      <View :style="styles.bodyContainer">
        <Text :style="styles.bodyText">{{ bodyContent }}</Text>
      </View>

      <View :style="styles.dateContainer">
        <Text :style="styles.dateText">{{ dataOfIssue }}</Text>
      </View>

      <Image :src="signerSignature" :style="styles.signatureImage" />

      <View :style="styles.titleContainer">
        <Text :style="styles.titleText">{{ signerTitle }}</Text>
      </View>
    </Page>
  </Document>
</template>
