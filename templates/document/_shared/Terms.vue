<script setup lang="ts">
import { computed } from 'vue'
import { View, Text, fitsOnPage } from './pdf'
import type { TermSection } from './terms'

const props = defineProps<{
  sections: TermSection[]
  /** Optional section heading, for example "TERMS & CONDITIONS". Omit to render the terms inline. */
  heading?: string
  headingStyle?: Record<string, string | number>
}>()

type Block = TermSection['blocks'][number]

const blockTexts = (block: Block) => (block.type === 'list' ? block.items.flatMap((item) => [item.text, ...(item.subitems ?? []).map((subitem) => subitem.text)]) : [block.text])

/** The pieces the page breaker may move between pages. A heading and a title always travel with the block after them. */
const chunks = computed(() =>
  props.sections.flatMap((section, sIndex) => {
    const groups = section.keepTogether ? [section.blocks] : section.blocks.map((block) => [block])
    return (groups.length > 0 ? groups : [[]]).map((blocks, gIndex) => ({
      heading: sIndex === 0 && gIndex === 0 ? props.heading : undefined,
      title: gIndex === 0 && section.title ? `${section.number}. ${section.title}` : undefined,
      titled: Boolean(section.title),
      blocks,
      // Terms run the full width of the page.
      fits: fitsOnPage(blocks.flatMap(blockTexts), 70),
    }))
  })
)

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
    <!-- A flat list on purpose: the page breaker cannot move a block that is the first thing inside its own wrapper. -->
    <View v-for="(chunk, cIndex) in chunks" :key="cIndex" :wrap="!chunk.fits">
      <Text v-if="chunk.heading" :style="headingStyle">{{ chunk.heading }}</Text>
      <Text v-if="chunk.title" :style="styles.termTitle">{{ chunk.title }}</Text>

      <View v-for="(block, bIndex) in chunk.blocks" :key="bIndex">
        <Text v-if="block.type === 'heading'" :style="chunk.titled ? styles.termSubHeading : styles.termHeading">{{ block.text }}</Text>
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
