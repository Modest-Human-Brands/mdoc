<script setup lang="ts">
import { View, Text } from '@ceereals/vue-pdf'
import type { TermSection } from './terms'

defineProps<{
  sections: TermSection[]
  /** Optional section heading, for example "TERMS & CONDITIONS". Omit to render the terms inline. */
  heading?: string
  headingStyle?: Record<string, string | number>
}>()

const styles = {
  termTitle: { fontSize: 13, fontWeight: 'bold' as const, color: '#000000', marginTop: 14, marginBottom: 4 },
  termHeading: { fontSize: 16, fontWeight: 'bold' as const, marginTop: 16, marginBottom: 8, color: '#000000' },
  termSubHeading: { fontSize: 12, fontWeight: 'bold' as const, marginTop: 6, marginBottom: 3, color: '#000000' },
  termParagraph: { color: '#444444', fontSize: 12, marginBottom: 6 },
  list: { marginLeft: 8, marginBottom: 6 },
  bulletRow: { flexDirection: 'row' as const, marginBottom: 3 },
  bulletText: { flex: 1, color: '#555555', fontSize: 12, lineHeight: 1.4 },
}
</script>

<template>
  <View v-if="sections.length > 0">
    <Text v-if="heading" :style="headingStyle">{{ heading }}</Text>

    <View v-for="(section, sIndex) in sections" :key="sIndex" :wrap="!section.keepTogether">
      <Text v-if="section.title" :style="styles.termTitle" :min-presence-ahead="48">{{ section.number }}. {{ section.title }}</Text>

      <View v-for="(block, bIndex) in section.blocks" :key="bIndex" :wrap="false">
        <Text v-if="block.type === 'heading'" :style="section.title ? styles.termSubHeading : styles.termHeading">{{ block.text }}</Text>
        <Text v-if="block.type === 'paragraph'" :style="styles.termParagraph">{{ block.text }}</Text>
        <View v-if="block.type === 'list'" :style="styles.list">
          <View v-for="(item, iIndex) in block.items" :key="iIndex">
            <View :style="styles.bulletRow">
              <Text :style="styles.bulletText">- {{ item.text }}</Text>
            </View>
            <View v-if="item.subitems" :style="{ marginLeft: 16 }">
              <View v-for="(subitem, subIndex) in item.subitems" :key="'sub_' + subIndex" :style="styles.bulletRow">
                <Text :style="styles.bulletText">• {{ subitem.text }}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  </View>
</template>
